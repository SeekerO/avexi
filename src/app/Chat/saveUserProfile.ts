/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "./firebase";
import { ref, set } from "firebase/database";

export async function saveUserProfile(user: any) {
  const userRef = ref(db, `users/${user.uid}`);
  await set(userRef, {
    email: user.email,
    name: user.displayName,
    profilePic: user.photoURL, // This is where the profile picture URL is stored
  });
}
