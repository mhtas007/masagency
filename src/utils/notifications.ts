import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const addNotification = async (title: string, message: string, type: string) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      title,
      message,
      type,
      created_at: new Date().toISOString(),
      read: false
    });
  } catch (error) {
    console.error('Error adding notification:', error);
  }
};
