from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    name: str


class User(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    created_at: str = Field(default_factory=now_iso)


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


class Category(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    created_at: str = Field(default_factory=now_iso)


class RangeInput(BaseModel):
    min_price: float
    max_price: Optional[float] = None  # None = sin límite
    warranty_price: float
    sku: Optional[str] = None


class WarrantyRange(BaseModel):
    id: str = Field(default_factory=new_id)
    category_id: str
    min_price: float
    max_price: Optional[float] = None
    warranty_price: float
    sku: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class ProductColor(BaseModel):
    name: str
    sku: Optional[str] = None


class ProductInput(BaseModel):
    category_id: str
    brand: str
    model: str
    price: float
    sku: Optional[str] = None
    colors: List[ProductColor] = []
    notes: Optional[str] = None


class Product(BaseModel):
    id: str = Field(default_factory=new_id)
    category_id: str
    brand: str
    model: str
    price: float
    sku: Optional[str] = None
    colors: List[ProductColor] = []
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
@api_router.post("/users", response_model=User)
async def create_user(payload: UserCreate):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    user = User(name=name)
    await db.users.insert_one(user.dict())
    return user


@api_router.get("/users", response_model=List[User])
async def list_users():
    docs = await db.users.find({}, {"_id": 0}).to_list(1000)
    return docs


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    docs = await db.categories.find({"deleted_at": None}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return docs


@api_router.post("/categories", response_model=Category)
async def create_category(payload: CategoryCreate):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    cat = Category(name=name)
    doc = cat.dict()
    doc["deleted_at"] = None
    await db.categories.insert_one(doc)
    return cat


@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, payload: CategoryUpdate):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    res = await db.categories.find_one({"id": category_id, "deleted_at": None})
    if not res:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    await db.categories.update_one({"id": category_id}, {"$set": {"name": name}})
    res["name"] = name
    return clean(res)


@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    res = await db.categories.find_one({"id": category_id, "deleted_at": None})
    if not res:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    count = await db.products.count_documents({"category_id": category_id, "deleted_at": None})
    if count > 0:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar una categoría con equipos registrados",
        )
    await db.categories.update_one({"id": category_id}, {"$set": {"deleted_at": now_iso()}})
    await db.ranges.update_many(
        {"category_id": category_id, "deleted_at": None}, {"$set": {"deleted_at": now_iso()}}
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Warranty ranges
# ---------------------------------------------------------------------------
@api_router.get("/categories/{category_id}/ranges", response_model=List[WarrantyRange])
async def list_ranges(category_id: str):
    docs = (
        await db.ranges.find({"category_id": category_id, "deleted_at": None}, {"_id": 0})
        .sort("min_price", 1)
        .to_list(1000)
    )
    return docs


@api_router.post("/categories/{category_id}/ranges", response_model=WarrantyRange)
async def create_range(category_id: str, payload: RangeInput):
    cat = await db.categories.find_one({"id": category_id, "deleted_at": None})
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    r = WarrantyRange(category_id=category_id, **payload.dict())
    doc = r.dict()
    doc["deleted_at"] = None
    await db.ranges.insert_one(doc)
    return r


@api_router.put("/ranges/{range_id}", response_model=WarrantyRange)
async def update_range(range_id: str, payload: RangeInput):
    res = await db.ranges.find_one({"id": range_id, "deleted_at": None})
    if not res:
        raise HTTPException(status_code=404, detail="Rango no encontrado")
    update = payload.dict()
    await db.ranges.update_one({"id": range_id}, {"$set": update})
    res.update(update)
    return clean(res)


@api_router.delete("/ranges/{range_id}")
async def delete_range(range_id: str):
    res = await db.ranges.find_one({"id": range_id, "deleted_at": None})
    if not res:
        raise HTTPException(status_code=404, detail="Rango no encontrado")
    await db.ranges.update_one({"id": range_id}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
@api_router.get("/products", response_model=List[Product])
async def list_products(category_id: Optional[str] = None, q: Optional[str] = None):
    query: dict = {"deleted_at": None}
    if category_id:
        query["category_id"] = category_id
    if q:
        term = q.strip()
        if term:
            query["$or"] = [
                {"brand": {"$regex": term, "$options": "i"}},
                {"model": {"$regex": term, "$options": "i"}},
            ]
    docs = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    res = await db.products.find_one({"id": product_id, "deleted_at": None}, {"_id": 0})
    if not res:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return res


@api_router.post("/products", response_model=Product)
async def create_product(payload: ProductInput):
    if not payload.brand.strip() or not payload.model.strip():
        raise HTTPException(status_code=400, detail="Marca y Modelo son obligatorios")
    prod = Product(**payload.dict())
    prod.brand = prod.brand.strip()
    prod.model = prod.model.strip()
    doc = prod.dict()
    doc["deleted_at"] = None
    await db.products.insert_one(doc)
    return prod


@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, payload: ProductInput):
    res = await db.products.find_one({"id": product_id, "deleted_at": None})
    if not res:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if not payload.brand.strip() or not payload.model.strip():
        raise HTTPException(status_code=400, detail="Marca y Modelo son obligatorios")
    update = payload.dict()
    update["brand"] = update["brand"].strip()
    update["model"] = update["model"].strip()
    update["updated_at"] = now_iso()
    await db.products.update_one({"id": product_id}, {"$set": update})
    res.update(update)
    return clean(res)


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    res = await db.products.find_one({"id": product_id, "deleted_at": None})
    if not res:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    await db.products.update_one({"id": product_id}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "ElectroGestor API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
