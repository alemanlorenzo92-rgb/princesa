import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <LoginForm nextPath={params.next} />
    </Suspense>
  );
}
