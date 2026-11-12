import Link from "next/link";

import { EMPTY_POST, PostForm } from "@/components/admin/post-form";
import { requireAdmin } from "@/lib/admin/auth";

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <>
      <div className="grid gap-1">
        <Link
          href="/admin/blog"
          className="text-muted-foreground w-fit text-sm underline"
        >
          ← Blog
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Novo post</h1>
      </div>
      <PostForm initial={EMPTY_POST} />
    </>
  );
}
