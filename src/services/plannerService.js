import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, createWeeklyPlanItemDocument } from '../models/schemas';

/**
 * Service to handle CRUD operations for Weekly Planner items
 */
export const plannerService = {
    /**
     * Create a new planned time block for a task
     * @param {Object} data 
     * @returns {Promise<string>} docRef id
     */
    async createPlanItem(data) {
        try {
            const newItemDoc = createWeeklyPlanItemDocument(data);
            const itemsRef = collection(db, COLLECTIONS.WEEKLY_PLAN_ITEMS);
            const docRef = await addDoc(itemsRef, {
                ...newItemDoc,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating plan item:", error);
            throw error;
        }
    },

    /**
     * Update an existing time block (e.g. after drag/resize)
     * @param {string} itemId 
     * @param {Object} updates 
     */
    async updatePlanItem(itemId, updates) {
        try {
            const itemRef = doc(db, COLLECTIONS.WEEKLY_PLAN_ITEMS, itemId);
            await updateDoc(itemRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating plan item:", error);
            throw error;
        }
    },

    /**
     * Delete a planned time block
     * @param {string} itemId 
     */
    async deletePlanItem(itemId) {
        try {
            const itemRef = doc(db, COLLECTIONS.WEEKLY_PLAN_ITEMS, itemId);
            await deleteDoc(itemRef);
        } catch (error) {
            console.error("Error deleting plan item:", error);
            throw error;
        }
    },

    /**
     * Get all planner blocks that overlap with a specific week
     * Useful for fetching the current visible week constraints
     * @param {string} startYYYYMMDD Monday of the target week
     */
    async getWeeklyPlanItems(startYYYYMMDD) {
        try {
            // For simple querying, assume we match the weekStartDate key exactly
            // If the query needs to be range bounded, it would look at startDateTime >= ...
            // In Phase 1 we use weekStartDate equal filter
            const itemsRef = collection(db, COLLECTIONS.WEEKLY_PLAN_ITEMS);
            const q = query(itemsRef, where("weekStartDate", "==", startYYYYMMDD));

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching weekly plan items:", error);
            throw error;
        }
    }
};
