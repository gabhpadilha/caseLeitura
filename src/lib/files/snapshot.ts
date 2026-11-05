/**
 * Copia o arquivo escolhido para a memória do aparelho.
 *
 * Arquivos abertos direto do Google Drive (ou de outra nuvem) no Android muitas vezes
 * são só uma referência: a primeira leitura funciona, mas a segunda, na hora de
 * enviar ao Storage, falha como se fosse erro de conexão. Lendo tudo uma vez e
 * usando a cópia, o envio não depende mais do arquivo original.
 */
export async function snapshotFile(file: File): Promise<File> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new Error(
      "Não foi possível ler o arquivo. Se ele está no Google Drive ou em outra nuvem, baixe para o celular e escolha de novo.",
    );
  }
  if (buffer.byteLength === 0) {
    throw new Error(
      "O arquivo chegou vazio. Se ele está no Google Drive, baixe para o celular antes de enviar.",
    );
  }
  return new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
}
