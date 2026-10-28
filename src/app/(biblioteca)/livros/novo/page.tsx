import { UploadBookForm } from "@/components/upload/UploadBookForm";

export default function NovoLivroPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 font-display text-5xl font-medium">Enviar PDF</h1>
      <p className="mb-10 text-graphite">
        O texto é extraído e limpo no seu navegador antes do envio.
      </p>
      <UploadBookForm />
    </div>
  );
}
