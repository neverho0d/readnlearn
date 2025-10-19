/**
 * Story Generation Queue
 *
 * Handles asynchronous story generation for content with multiple phrases.
 * Stories are generated in the background when phrases are saved, making
 * them ready for immediate use in study sessions.
 */

import { supabase } from "../supabase/client";
import { migrateStoryTables, checkStoryTablesExist } from "../db/migrateStories";
import { PhraseStory } from "./storyGenerator";
import { generateStoryForContent } from "./storyGenerator.js";
import { statusStore } from "../status/StatusStore";

export interface StoryGenerationJob {
    id: string;
    contentHash: string;
    phraseIds: string[];
    l1: string;
    l2: string;
    level: string;
    difficulties: string[];
    retryCount: number;
    maxRetries: number;
    status: "pending" | "processing" | "completed" | "failed";
    createdAt: string;
    updatedAt: string;
}

export interface StoryResult {
    story: string;
    usedPhrases: string[];
    glosses: Array<{ phrase: string; gloss: string }>;
}

/**
 * Queue a story generation job
 */
export async function queueStoryGeneration(
    job: Omit<StoryGenerationJob, "id" | "retryCount" | "status" | "createdAt" | "updatedAt">,
): Promise<void> {
    console.log("=== queueStoryGeneration called ===");
    console.log("Queueing story generation job:", job);
    try {
        // Check if story tables exist, migrate if needed
        const tablesExist = await checkStoryTablesExist();
        if (!tablesExist) {
            console.log("Story tables don't exist, running migration...");
            await migrateStoryTables();
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Check if individual phrase stories already exist for this content
        console.log("Checking if phrase stories already exist for this content:", job.contentHash);
        const { data: existingStories, error: storyError } = await supabase
            .from("stories")
            .select("phrase_id, status")
            .eq("user_id", user.id)
            .eq("content_hash", job.contentHash)
            .eq("status", "ready");

        console.log("Story check result:", { existingStories, storyError });

        if (storyError) {
            console.error("Error checking for existing stories:", storyError);
            throw storyError;
        }

        if (existingStories && existingStories.length > 0) {
            console.log("Found existing phrase stories:", existingStories.length);

            // Check if all requested phrases already have stories
            const existingPhraseIds = new Set(existingStories.map((s) => s.phrase_id));
            const missingPhraseIds = job.phraseIds.filter((id) => !existingPhraseIds.has(id));

            if (missingPhraseIds.length === 0) {
                console.log("All phrases already have stories, skipping queueStoryGeneration");
                return;
            }

            // Update job to only include missing phrases
            console.log(
                "Some phrases missing stories, updating job with missing phrases:",
                missingPhraseIds,
            );
            job.phraseIds = missingPhraseIds;
        }

        // Check for existing jobs and handle different scenarios
        console.log("Checking for existing jobs for this content:", job.contentHash);
        const { data: existingJobs, error: jobError } = await supabase
            .from("story_queue")
            .select("id, status, phrase_ids, created_at")
            .eq("user_id", user.id)
            .eq("content_hash", job.contentHash)
            .neq("status", "failed")
            .order("created_at", { ascending: false });

        if (jobError) {
            console.error("Error checking for existing jobs:", jobError);
            throw jobError;
        }

        console.log("Existing jobs found:", existingJobs?.length || 0);

        if (existingJobs && existingJobs.length > 0) {
            const latestJob = existingJobs[0];
            console.log(
                "Found existing job:",
                latestJob.status,
                "with phrases:",
                latestJob.phrase_ids,
            );

            // Case 1: Job is processing - check if it's stuck (older than 5 minutes)
            if (latestJob.status === "processing") {
                const jobAge = Date.now() - new Date(latestJob.created_at).getTime();
                const fiveMinutes = 5 * 60 * 1000;
                if (jobAge > fiveMinutes) {
                    console.log("Job appears stuck, resetting to pending");
                    await supabase
                        .from("story_queue")
                        .update({
                            status: "pending",
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", latestJob.id);
                } else {
                    console.log("Job is actively processing, skipping");
                    return;
                }
            }

            // Case 2: Job is pending - check if new phrases were added
            if (latestJob.status === "pending") {
                const existingPhraseIds = new Set(latestJob.phrase_ids || []);
                const newPhraseIds = job.phraseIds.filter((id) => !existingPhraseIds.has(id));
                if (newPhraseIds.length > 0) {
                    console.log(
                        "New phrases detected, updating job with additional phrases:",
                        newPhraseIds,
                    );

                    // Update existing job with new phrases
                    const updatedPhraseIds = [...(latestJob.phrase_ids || []), ...newPhraseIds];
                    await supabase
                        .from("story_queue")
                        .update({
                            phrase_ids: updatedPhraseIds,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", latestJob.id);

                    console.log("Updated job with", updatedPhraseIds.length, "total phrases");
                    // Clean up old failed jobs and start processing queue in background
                    cleanupFailedJobs().catch(console.error);
                    processStoryQueue().catch(console.error);
                    return;
                } else {
                    console.log("No new phrases, job already queued with same phrases");
                    return;
                }
            }
        }

        // Create new job
        console.log("Creating new job:", job);
        const newJob: StoryGenerationJob = {
            id: crypto.randomUUID(),
            ...job,
            retryCount: 0,
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        console.log("New job created:", newJob);

        console.log(
            "Storing job with phraseIds:",
            newJob.phraseIds,
            "Type:",
            typeof newJob.phraseIds,
        );
        const { error } = await supabase.from("story_queue").insert({
            id: newJob.id,
            user_id: user.id,
            content_hash: newJob.contentHash,
            phrase_ids: newJob.phraseIds,
            l1: newJob.l1,
            l2: newJob.l2,
            level: newJob.level,
            difficulties: newJob.difficulties,
            retry_count: newJob.retryCount,
            max_retries: newJob.maxRetries,
            status: newJob.status,
            created_at: newJob.createdAt,
            updated_at: newJob.updatedAt,
        });

        if (error) {
            console.error("Failed to queue story generation:", error);
            throw error;
        }

        console.log("Story generation job queued:", newJob.id);
        console.log("=== queueStoryGeneration completed successfully ===");

        // Clean up old failed jobs and start processing queue in background
        cleanupFailedJobs().catch(console.error);
        processStoryQueue().catch(console.error);
    } catch (error) {
        console.error("Failed to queue story generation:", error);
        throw error;
    }
}

/**
 * Process the story generation queue
 */
export async function processStoryQueue(): Promise<void> {
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Reset any stuck jobs first
        await resetStuckJobs();

        // Get next pending job
        console.log("Getting next pending job");
        const { data: jobs, error } = await supabase
            .from("story_queue")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1);

        if (error) {
            console.error("Failed to fetch story queue:", error);
            return;
        }

        if (!jobs || jobs.length === 0) {
            console.log("No pending story generation jobs");
            return;
        }

        const rawJob = jobs[0];
        console.log("Processing story generation job:", rawJob);

        // Map snake_case database fields to camelCase interface
        const job: StoryGenerationJob = {
            id: rawJob.id,
            contentHash: rawJob.content_hash,
            phraseIds: rawJob.phrase_ids,
            l1: rawJob.l1,
            l2: rawJob.l2,
            level: rawJob.level,
            difficulties: rawJob.difficulties,
            retryCount: rawJob.retry_count,
            maxRetries: rawJob.max_retries,
            status: rawJob.status,
            createdAt: rawJob.created_at,
            updatedAt: rawJob.updated_at,
        };

        console.log("Mapped job phraseIds:", job.phraseIds, "Type:", typeof job.phraseIds);

        // Ensure phraseIds is properly formatted as an array
        const phraseIds = Array.isArray(job.phraseIds) ? job.phraseIds : [];
        console.log("Processed phraseIds:", phraseIds);

        if (phraseIds.length === 0) {
            console.error("No valid phrase IDs found in job:", job);
            throw new Error("No valid phrase IDs found for story generation");
        }

        // Update job status to processing with race condition protection
        const { error: updateError } = await supabase
            .from("story_queue")
            .update({
                status: "processing",
                updated_at: new Date().toISOString(),
            })
            .eq("id", job.id)
            .eq("status", "pending"); // Only update if still pending (race condition protection)

        if (updateError) {
            console.error("Failed to update job status:", updateError);
            throw updateError;
        }

        // Check if job was actually updated (another process might have taken it)
        const { data: updatedJob } = await supabase
            .from("story_queue")
            .select("status")
            .eq("id", job.id)
            .single();

        if (updatedJob?.status !== "processing") {
            console.log("Job was taken by another process, skipping");
            return;
        }

        // Add status task for story generation
        const taskId = statusStore.addTask({
            type: "story_generation",
            status: "processing",
            phrase: `Generating stories for ${phraseIds.length} phrases`,
            phraseId: phraseIds[0] || "unknown",
        });

        try {
            // Check if stories table exists and has correct schema
            console.log("Checking stories table schema...");
            const { error: tableError } = await supabase
                .from("stories")
                .select("phrase_id")
                .limit(1);

            if (tableError) {
                console.error("Stories table schema check failed:", tableError);
                if (tableError.code === "42P01") {
                    throw new Error(
                        "Stories table does not exist. Please run the database migration: scripts/migrate-individual-stories.sql",
                    );
                }
                throw new Error(`Database schema error: ${tableError.message}`);
            }
            console.log("Stories table schema is correct");

            // Generate story
            console.log("Generating story for content:", job.contentHash);

            const storyResult = await generateStoryForContent(
                job.contentHash,
                phraseIds,
                job.l1,
                job.l2,
                job.level,
                job.difficulties,
            );

            // Save individual phrase stories to database
            console.log(`Saving ${storyResult.length} phrase stories to database...`);
            for (const phraseStory of storyResult) {
                console.log(
                    `Saving story for phrase: "${phraseStory.phrase}" (ID: ${phraseStory.phraseId})`,
                );

                const insertData = {
                    user_id: user.id,
                    content_hash: job.contentHash,
                    phrase_id: phraseStory.phraseId,
                    phrase: phraseStory.phrase,
                    translation: phraseStory.translation,
                    story: phraseStory.story,
                    context: phraseStory.context,
                    status: "ready",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                console.log("Insert data:", {
                    user_id: insertData.user_id,
                    content_hash: insertData.content_hash,
                    phrase_id: insertData.phrase_id,
                    phrase: insertData.phrase.substring(0, 50) + "...",
                    story_length: insertData.story.length,
                    status: insertData.status,
                });

                const { data: insertResult, error: saveError } = await supabase
                    .from("stories")
                    .insert(insertData)
                    .select();

                if (saveError) {
                    console.error("Failed to save phrase story:", saveError);
                    throw new Error(`Failed to save phrase story: ${saveError.message}`);
                }

                console.log("Successfully saved phrase story:", insertResult);
            }

            // Update job status to completed
            await supabase
                .from("story_queue")
                .update({
                    status: "completed",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", job.id);

            console.log("Story generation completed:", job.id);

            // Mark story generation task as completed
            statusStore.completeTask(taskId, "completed");

            // Process next job
            setTimeout(() => processStoryQueue(), 1000);
        } catch (error) {
            console.error("Story generation failed:", error);

            // Mark story generation task as failed
            statusStore.completeTask(
                taskId,
                "failed",
                error instanceof Error ? error.message : "Unknown error",
            );

            // Update job status to failed
            await supabase
                .from("story_queue")
                .update({
                    status: "failed",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", job.id);

            // Retry if under max retries
            if (job.retryCount < job.maxRetries) {
                await supabase
                    .from("story_queue")
                    .update({
                        retry_count: job.retryCount + 1,
                        status: "pending",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", job.id);

                const retryCount = job.retryCount + 1;
                const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 30000); // Max 30 seconds
                console.log(
                    `Retrying story generation: ${job.id}, attempt ${retryCount}, backoff: ${backoffMs}ms`,
                );
                setTimeout(() => processStoryQueue(), backoffMs);
            }
        }
    } catch (error) {
        console.error("Failed to process story queue:", error);
    }
}

/**
 * Get story for content hash
 */
export async function getStoryForContent(contentHash: string): Promise<PhraseStory[] | null> {
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data: stories, error } = await supabase
            .from("stories")
            .select("*")
            .eq("user_id", user.id)
            .eq("content_hash", contentHash)
            .eq("status", "ready")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching stories:", error);
            throw error;
        }

        if (!stories || stories.length === 0) {
            return null; // No stories found
        }

        return stories.map((story) => ({
            phraseId: story.phrase_id,
            phrase: story.phrase,
            translation: story.translation,
            story: story.story,
            context: story.context,
        }));
    } catch (error) {
        console.error("Failed to get story for content:", error);
        return null;
    }
}

/**
 * Get story generation status for content hash
 */
export async function getStoryStatus(
    contentHash: string,
): Promise<"ready" | "generating" | "failed" | "not_found"> {
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Check if story exists (get most recent)
        const { data: story, error: storyError } = await supabase
            .from("stories")
            .select("status")
            .eq("user_id", user.id)
            .eq("content_hash", contentHash)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (storyError) {
            console.error("Error checking story status:", storyError);
            return "not_found";
        }

        if (story) {
            return story.status === "ready" ? "ready" : "failed";
        }

        // Check if job is in queue (get most recent)
        const { data: job, error: jobError } = await supabase
            .from("story_queue")
            .select("status")
            .eq("user_id", user.id)
            .eq("content_hash", contentHash)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (jobError) {
            console.error("Error checking job status:", jobError);
            return "not_found";
        }

        if (job) {
            return job.status === "processing" ? "generating" : "failed";
        }

        return "not_found";
    } catch (error) {
        console.error("Failed to get story status:", error);
        return "not_found";
    }
}

/**
 * Reset stuck processing jobs (older than 5 minutes)
 */
export async function resetStuckJobs(): Promise<void> {
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { error } = await supabase
            .from("story_queue")
            .update({
                status: "pending",
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("status", "processing")
            .lt("updated_at", fiveMinutesAgo);

        if (error) {
            console.error("Failed to reset stuck jobs:", error);
        } else {
            console.log("Reset stuck processing jobs");
        }
    } catch (error) {
        console.error("Failed to reset stuck jobs:", error);
    }
}

/**
 * Clean up old failed jobs and allow retry
 */
export async function cleanupFailedJobs(): Promise<void> {
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Delete failed jobs older than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { error } = await supabase
            .from("story_queue")
            .delete()
            .eq("user_id", user.id)
            .eq("status", "failed")
            .lt("created_at", oneHourAgo);

        if (error) {
            console.error("Failed to cleanup old failed jobs:", error);
        } else {
            console.log("Cleaned up old failed story generation jobs");
        }
    } catch (error) {
        console.error("Failed to cleanup failed jobs:", error);
    }
}

/**
 * Retry a failed story generation job
 */
export async function retryFailedStory(contentHash: string): Promise<void> {
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Get the failed job parameters before deleting
        const { data: failedJob, error: fetchError } = await supabase
            .from("story_queue")
            .select("*")
            .eq("user_id", user.id)
            .eq("content_hash", contentHash)
            .eq("status", "failed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError) {
            console.error("Failed to fetch failed job:", fetchError);
            throw fetchError;
        }

        if (!failedJob) {
            console.log("No failed job found for content:", contentHash);
            return;
        }

        console.log("Found failed job:", failedJob);
        console.log(
            "Failed job phrase_ids:",
            failedJob.phrase_ids,
            "Type:",
            typeof failedJob.phrase_ids,
        );

        // Delete the failed job
        const { error: deleteError } = await supabase
            .from("story_queue")
            .delete()
            .eq("user_id", user.id)
            .eq("content_hash", contentHash)
            .eq("status", "failed");

        if (deleteError) {
            console.error("Failed to delete failed job:", deleteError);
            throw deleteError;
        }

        // Queue new story generation with original parameters
        console.log("Retrying story generation with parameters:", {
            contentHash,
            phraseIds: failedJob.phrase_ids,
            l1: failedJob.l1,
            l2: failedJob.l2,
            level: failedJob.level,
            difficulties: failedJob.difficulties,
            maxRetries: failedJob.max_retries,
        });

        try {
            await queueStoryGeneration({
                contentHash,
                phraseIds: failedJob.phrase_ids,
                l1: failedJob.l1,
                l2: failedJob.l2,
                level: failedJob.level,
                difficulties: failedJob.difficulties,
                maxRetries: failedJob.max_retries,
            });
            console.log("Successfully queued retry story generation for content:", contentHash);
        } catch (queueError) {
            console.error("Failed to queue retry story generation:", queueError);
            throw queueError;
        }
    } catch (error) {
        console.error("Failed to retry story generation:", error);
        throw error;
    }
}
