import { Suspense } from "react";
import { UploadBookForm } from "@/components/upload/UploadBookForm";

export default function NovoLivroPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-1 text-graphite">Adicionar à estante</p>
      <h1 className="mb-10 font-display text-5xl font-medium">
        O que você vai <em>guardar</em>?
      </h1>
      {/* O formulário lê ?tipo=quadrinho (vindo da banca de quadrinhos). */}
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <UploadBookForm />
      </Suspense>
    </div>
  );
}
