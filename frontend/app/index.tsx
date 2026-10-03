import { Redirect } from "expo-router";
import { View } from "react-native";

import { LoadingState } from "@/src/components/empty-state";
import { makeStyles } from "@/src/theme";
import { useCurrentUser } from "@/src/user";

export default function Index() {
  const styles = useStyles();
  const { name, loading } = useCurrentUser();

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingState />
      </View>
    );
  }

  if (!name) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
}));
