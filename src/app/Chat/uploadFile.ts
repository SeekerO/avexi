import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadFile(file: File, chatId: string) {
  const fileRef = ref(
    storage,
    `chat_uploads/${chatId}/${Date.now()}_${file.name}`
  );
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
