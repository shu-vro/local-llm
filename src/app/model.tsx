import { Redirect, type Href } from "expo-router";

export default function ModelRedirect() {
  return <Redirect href={"/models" as Href} />;
}
