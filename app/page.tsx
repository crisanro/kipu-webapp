"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <Loader2 size={24} className="animate-spin text-indigo-400" />
    </div>
  );
}