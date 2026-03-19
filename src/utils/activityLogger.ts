import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

export const logActivity = async (
  userId: string,
  userEmail: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string
) => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      user_id: userId,
      user_email: userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // We don't want to break the main flow if logging fails, but we should record it
    console.error('Failed to log activity:', error);
  }
};
