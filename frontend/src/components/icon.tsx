import Ionicons from "@react-native-vector-icons/ionicons";
import { type ComponentProps } from "react";

// Thin wrapper so screens can pass any icon name without fighting the strict
// union type from the scoped package.
type Props = Omit<ComponentProps<typeof Ionicons>, "name"> & { name: string };

export function Icon({ name, ...rest }: Props) {
  const IconAny = Ionicons as unknown as React.ComponentType<any>;
  return <IconAny name={name} {...rest} />;
}
