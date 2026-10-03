"""
ElectroGestor backend API tests (Users, Categories, Warranty Ranges, Products).
Covers: CRUD, filters, warranty computation data, delete-with-children guard.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_ids():
    # bookkeeping to clean up at end
    return {"categories": [], "ranges": [], "products": []}


# --- Users ---------------------------------------------------------------
class TestUsers:
    def test_create_user(self, http):
        r = http.post(f"{API}/users", json={"name": "TEST_Vendedor"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_Vendedor"
        assert "id" in data and "created_at" in data

    def test_create_user_empty_name_fails(self, http):
        r = http.post(f"{API}/users", json={"name": "   "})
        assert r.status_code == 400

    def test_list_users_contains_test(self, http):
        r = http.get(f"{API}/users")
        assert r.status_code == 200
        names = [u["name"] for u in r.json()]
        assert "TEST_Vendedor" in names


# --- Categories ----------------------------------------------------------
class TestCategories:
    def test_create_category(self, http, created_ids):
        r = http.post(f"{API}/categories", json={"name": "TEST_Celulares"})
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["name"] == "TEST_Celulares"
        created_ids["categories"].append(c["id"])

    def test_create_category_empty_fails(self, http):
        r = http.post(f"{API}/categories", json={"name": ""})
        assert r.status_code == 400

    def test_list_categories(self, http, created_ids):
        r = http.get(f"{API}/categories")
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert created_ids["categories"][0] in ids

    def test_update_category(self, http, created_ids):
        cid = created_ids["categories"][0]
        r = http.put(f"{API}/categories/{cid}", json={"name": "TEST_Celulares_Renamed"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Celulares_Renamed"
        # GET-verify persistence
        r2 = http.get(f"{API}/categories")
        found = next((c for c in r2.json() if c["id"] == cid), None)
        assert found and found["name"] == "TEST_Celulares_Renamed"

    def test_update_category_not_found(self, http):
        r = http.put(f"{API}/categories/does-not-exist", json={"name": "X"})
        assert r.status_code == 404


# --- Warranty Ranges -----------------------------------------------------
class TestWarrantyRanges:
    def test_create_three_ranges(self, http, created_ids):
        cid = created_ids["categories"][0]
        payloads = [
            {"min_price": 0, "max_price": 500, "warranty_price": 25, "sku": "G-25"},
            {"min_price": 500, "max_price": 1000, "warranty_price": 50, "sku": "G-50"},
            {"min_price": 1000, "max_price": None, "warranty_price": 80, "sku": "G-80"},
        ]
        for p in payloads:
            r = http.post(f"{API}/categories/{cid}/ranges", json=p)
            assert r.status_code == 200, r.text
            created_ids["ranges"].append(r.json()["id"])

    def test_list_ranges_sorted(self, http, created_ids):
        cid = created_ids["categories"][0]
        r = http.get(f"{API}/categories/{cid}/ranges")
        assert r.status_code == 200
        ranges = r.json()
        assert len(ranges) >= 3
        mins = [x["min_price"] for x in ranges]
        assert mins == sorted(mins)
        # verify open-ended range persisted
        unlimited = [x for x in ranges if x["max_price"] is None]
        assert len(unlimited) == 1

    def test_warranty_computation_matches_ranges(self, http, created_ids):
        """Simulate frontend findRange() for prices 300, 750, 1500."""
        cid = created_ids["categories"][0]
        ranges = http.get(f"{API}/categories/{cid}/ranges").json()

        def find(price):
            for r in sorted(ranges, key=lambda x: x["min_price"]):
                ok_min = price >= r["min_price"]
                ok_max = r["max_price"] is None or price < r["max_price"]
                if ok_min and ok_max:
                    return r
            return None

        assert find(300)["warranty_price"] == 25
        assert find(750)["warranty_price"] == 50
        assert find(1500)["warranty_price"] == 80

    def test_update_range(self, http, created_ids):
        rid = created_ids["ranges"][0]
        r = http.put(
            f"{API}/ranges/{rid}",
            json={"min_price": 0, "max_price": 500, "warranty_price": 30, "sku": "G-30"},
        )
        assert r.status_code == 200
        assert r.json()["warranty_price"] == 30

    def test_delete_range(self, http, created_ids):
        rid = created_ids["ranges"].pop()
        r = http.delete(f"{API}/ranges/{rid}")
        assert r.status_code == 200
        # Verify not listed anymore
        cid = created_ids["categories"][0]
        remaining = [x["id"] for x in http.get(f"{API}/categories/{cid}/ranges").json()]
        assert rid not in remaining


# --- Products ------------------------------------------------------------
class TestProducts:
    def test_create_product(self, http, created_ids):
        cid = created_ids["categories"][0]
        payload = {
            "category_id": cid,
            "brand": "Samsung",
            "model": "Galaxy S24",
            "price": 1500.50,
            "sku": "P-SAM-S24",
            "colors": [
                {"name": "Negro", "sku": "C-NEG"},
                {"name": "Blanco", "sku": "C-BLA"},
            ],
            "notes": "TEST",
        }
        r = http.post(f"{API}/products", json=payload)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["brand"] == "Samsung" and p["model"] == "Galaxy S24"
        assert len(p["colors"]) == 2
        created_ids["products"].append(p["id"])

        # GET verify persistence
        g = http.get(f"{API}/products/{p['id']}")
        assert g.status_code == 200
        assert g.json()["price"] == 1500.50

    def test_create_product_brand_grouping_variants(self, http, created_ids):
        """Create 2 more products with brand variants to test case/accents grouping on frontend."""
        cid = created_ids["categories"][0]
        for brand, model, price in [
            ("samsung", "A14", 450),
            ("SÁMSUNG", "A54", 800),  # with accent + uppercase
            ("Apple", "iPhone 15", 4500),
        ]:
            r = http.post(
                f"{API}/products",
                json={
                    "category_id": cid,
                    "brand": brand,
                    "model": model,
                    "price": price,
                    "colors": [],
                },
            )
            assert r.status_code == 200
            created_ids["products"].append(r.json()["id"])

    def test_create_product_missing_brand_fails(self, http, created_ids):
        cid = created_ids["categories"][0]
        r = http.post(
            f"{API}/products",
            json={"category_id": cid, "brand": "  ", "model": "X", "price": 1, "colors": []},
        )
        assert r.status_code == 400

    def test_list_products_by_category(self, http, created_ids):
        cid = created_ids["categories"][0]
        r = http.get(f"{API}/products", params={"category_id": cid})
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_search_products_q(self, http, created_ids):
        # Search by brand
        r = http.get(f"{API}/products", params={"q": "Samsung"})
        assert r.status_code == 200
        brands = [p["brand"].lower() for p in r.json()]
        assert any("samsung" in b or "sámsung" in b for b in brands)

        # Search by model
        r2 = http.get(f"{API}/products", params={"q": "iPhone"})
        assert r2.status_code == 200
        assert any("iphone" in p["model"].lower() for p in r2.json())

    def test_update_product(self, http, created_ids):
        pid = created_ids["products"][0]
        payload = {
            "category_id": http.get(f"{API}/products/{pid}").json()["category_id"],
            "brand": "Samsung",
            "model": "Galaxy S24 Ultra",
            "price": 1799.90,
            "sku": "P-SAM-S24U",
            "colors": [{"name": "Titanio", "sku": "C-TIT"}],
            "notes": "Updated",
        }
        r = http.put(f"{API}/products/{pid}", json=payload)
        assert r.status_code == 200
        # GET-verify
        g = http.get(f"{API}/products/{pid}").json()
        assert g["model"] == "Galaxy S24 Ultra" and g["price"] == 1799.90
        assert len(g["colors"]) == 1


# --- Delete category guard + cleanup ------------------------------------
class TestCleanup:
    def test_delete_category_with_products_fails(self, http, created_ids):
        cid = created_ids["categories"][0]
        r = http.delete(f"{API}/categories/{cid}")
        assert r.status_code == 400
        assert "equipos" in r.json().get("detail", "").lower()

    def test_delete_products_then_category(self, http, created_ids):
        # Remove all products
        for pid in created_ids["products"]:
            r = http.delete(f"{API}/products/{pid}")
            assert r.status_code == 200
        # Verify product GET returns 404
        if created_ids["products"]:
            g = http.get(f"{API}/products/{created_ids['products'][0]}")
            assert g.status_code == 404

        # Now delete remaining ranges
        for rid in list(created_ids["ranges"]):
            http.delete(f"{API}/ranges/{rid}")

        # Finally delete the category
        cid = created_ids["categories"][0]
        r = http.delete(f"{API}/categories/{cid}")
        assert r.status_code == 200

    def test_delete_category_not_found(self, http):
        r = http.delete(f"{API}/categories/nonexistent-id")
        assert r.status_code == 404
