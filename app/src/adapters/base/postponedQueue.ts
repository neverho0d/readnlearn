/**
 * Postponed execution queue for failed LLM requests
 *
 * Handles queuing and retrying failed requests when all providers are unavailable
 */

export interface PostponedRequest {
    id: string;
    type: "translation" | "story" | "cloze";
    data: any;
    createdAt: string;
    retryCount: number;
    maxRetries: number;
}

export class PostponedQueue {
    private dbName = "readnlearn-postponed";
    private dbVersion = 1;
    private storeName = "postponedRequests";

    /**
     * Initialize IndexedDB for postponed requests
     */
    private async initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, "id");
                    store.createIndex("type", "type", { unique: false });
                    store.createIndex("createdAt", "createdAt", { unique: false });
                }
            };
        });
    }

    /**
     * Add a request to the postponed queue
     */
    async addRequest(
        type: "translation" | "story" | "cloze",
        data: any,
        maxRetries: number = 3,
    ): Promise<string> {
        const db = await this.initDB();
        const id = crypto.randomUUID();
        const request: PostponedRequest = {
            id,
            type,
            data,
            createdAt: new Date().toISOString(),
            retryCount: 0,
            maxRetries,
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const putRequest = store.put(request);

            putRequest.onsuccess = () => resolve(id);
            putRequest.onerror = () => reject(putRequest.error);
        });
    }

    /**
     * Get all pending requests
     */
    async getPendingRequests(): Promise<PostponedRequest[]> {
        const db = await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Remove a request from the queue
     */
    async removeRequest(id: string): Promise<void> {
        const db = await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const deleteRequest = store.delete(id);

            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        });
    }

    /**
     * Update retry count for a request
     */
    async updateRetryCount(id: string, retryCount: number): Promise<void> {
        const db = await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);

            // Get current request
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const request = getRequest.result;
                if (request) {
                    request.retryCount = retryCount;
                    const putRequest = store.put(request);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Get requests that are ready for retry
     */
    async getRetryableRequests(): Promise<PostponedRequest[]> {
        const requests = await this.getPendingRequests();
        const now = new Date();

        return requests.filter((request) => {
            // Check if request is ready for retry (exponential backoff)
            const createdAt = new Date(request.createdAt);
            const timeSinceCreation = now.getTime() - createdAt.getTime();
            const retryDelay = Math.pow(2, request.retryCount) * 60000; // 1min, 2min, 4min, etc.

            return timeSinceCreation >= retryDelay && request.retryCount < request.maxRetries;
        });
    }

    /**
     * Clean up old requests that have exceeded max retries
     */
    async cleanupExpiredRequests(): Promise<void> {
        const requests = await this.getPendingRequests();
        const expiredRequests = requests.filter(
            (request) => request.retryCount >= request.maxRetries,
        );

        for (const request of expiredRequests) {
            await this.removeRequest(request.id);
        }
    }
}

// Singleton instance
export const postponedQueue = new PostponedQueue();
