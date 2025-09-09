"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pollsDb, votesDb } from "./database/polls";
import type {
  CreatePollInput,
  CreateVoteInput,
  UpdatePollInput,
} from "./types/database";

/**
 * Server action to create a new poll
 */
export async function createPollAction(formData: FormData) {
  try {
    // Helper to extract poll options from formData
    function extractOptions(fd: FormData): string[] {
      const opts: string[] = [];
      let idx = 0;
      while (fd.has(`option_${idx}`)) {
        const val = fd.get(`option_${idx}`);
        if (typeof val === "string" && val.trim()) {
          opts.push(val.trim());
        }
        idx++;
      }
      return opts;
    }

    // Extract and sanitize form data
    const titleRaw = formData.get("title");
    const descriptionRaw = formData.get("description");
    const expiresAtRaw = formData.get("expires_at");
    const allowMultipleVotes = formData.get("allow_multiple_votes") === "on";
    const isAnonymous = formData.get("is_anonymous") === "on";
    const maxVotesPerUser = parseInt(formData.get("max_votes_per_user") as string) || 1;
    const userId = formData.get("user_id") as string;
    const options = extractOptions(formData);

    const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
    const description = typeof descriptionRaw === "string" ? descriptionRaw.trim() : undefined;
    const expires_at = typeof expiresAtRaw === "string" && expiresAtRaw ? expiresAtRaw : undefined;

    // Validate required fields
    if (!title) {
      throw new Error("Poll title is required");
    }
    if (options.length < 2) {
      throw new Error("Poll must have at least 2 options");
    }

    // Build poll input
    const pollInput: CreatePollInput = {
      title,
      description,
      expires_at,
      allow_multiple_votes: allowMultipleVotes,
      is_anonymous: isAnonymous,
      max_votes_per_user: maxVotesPerUser,
      options,
    };

    // Create the poll
    const result = await pollsDb.create(pollInput, userId || undefined);
    if (!result.success) {
      throw new Error(result.error?.message || "Failed to create poll");
    }

    // Revalidate and redirect
    revalidatePath("/polls");
    redirect(`/polls/${result.data!.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(message);
  }
}

/**
 * Server action to create a poll from JSON data
 */
export async function createPollFromData(
  pollData: CreatePollInput,
  userId?: string,
) {
  try {
    // Validate required fields
    if (!pollData.title || pollData.title.trim().length === 0) {
      throw new Error("Poll title is required");
    }

    if (!pollData.options || pollData.options.length < 2) {
      throw new Error("Poll must have at least 2 options");
    }

    // Create the poll
    const result = await pollsDb.create(pollData, userId);

    if (!result.success) {
      throw new Error(result.error?.message || "Failed to create poll");
    }

    // Revalidate the polls page
    revalidatePath("/polls");

    return result.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}

/**
 * Server action to vote on a poll
 */
export async function voteOnPollAction(formData: FormData) {
  try {
    const pollId = formData.get("poll_id") as string;
    const optionId = formData.get("option_id") as string;
    const userId = formData.get("user_id") as string;
    const voterIp = formData.get("voter_ip") as string;

    // Validate required fields
    if (!pollId) {
      throw new Error("Poll ID is required");
    }

    if (!optionId) {
      throw new Error("Option ID is required");
    }

    // Check if user has already voted
    if (userId) {
      const hasVoted = await votesDb.hasUserVoted(pollId, userId);
      if (!hasVoted.success) {
        throw new Error(
          hasVoted.error?.message || "Failed to check voting status",
        );
      }

      if (hasVoted.data) {
        throw new Error("You have already voted on this poll");
      }
    }

    // Create vote input
    const voteInput: CreateVoteInput = {
      poll_id: pollId,
      option_id: optionId,
      user_id: userId || undefined,
      voter_ip: voterIp || undefined,
    };

    // Create the vote
    const result = await votesDb.create(voteInput);

    if (!result.success) {
      throw new Error(result.error?.message || "Failed to record vote");
    }

    // Revalidate the poll page
    revalidatePath(`/polls/${pollId}`);
    revalidatePath("/polls");

    return result.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}

/**
 * Server action to update a poll
 */
export async function updatePollAction(pollId: string, formData: FormData) {
  try {
    // Extract form data
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const expiresAt = formData.get("expires_at") as string;
    const isActive = formData.get("is_active") === "on";
    const allowMultipleVotes = formData.get("allow_multiple_votes") === "on";
    const isAnonymous = formData.get("is_anonymous") === "on";
    const maxVotesPerUser = parseInt(
      formData.get("max_votes_per_user") as string,
    );

    // Create update input (only include fields that are provided)
    const updateInput: UpdatePollInput = {};

    if (title && title.trim()) {
      updateInput.title = title.trim();
    }

    if (typeof description === "string" && description.trim() === "") {
      // If description is an empty string or only whitespace, set to undefined.
      updateInput.description = undefined;
    } else if (typeof description === "string" && description.trim() !== "") {
      // If description is a non-empty string, use its trimmed value.
      updateInput.description = description.trim();
    }
    // If description is null, or not a string, it will not be added to updateInput, effectively ignoring it.

    if (expiresAt) {
      updateInput.expires_at = expiresAt;
    }

    if (formData.has("is_active")) {
      updateInput.is_active = isActive;
    }

    if (formData.has("allow_multiple_votes")) {
      updateInput.allow_multiple_votes = allowMultipleVotes;
    }

    if (formData.has("is_anonymous")) {
      updateInput.is_anonymous = isAnonymous;
    }

    if (formData.has("max_votes_per_user") && !isNaN(maxVotesPerUser)) {
      updateInput.max_votes_per_user = maxVotesPerUser;
    }

    // Update the poll
    const result = await pollsDb.update(pollId, updateInput);

    if (!result.success) {
      throw new Error(result.error?.message || "Failed to update poll");
    }

    // Revalidate the poll page
    revalidatePath(`/polls/${pollId}`);
    revalidatePath("/polls");

    return result.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}

/**
 * Server action to delete a poll
 */
export async function deletePollAction(pollId: string) {
  try {
    if (!pollId) {
      throw new Error("Poll ID is required");
    }

    // Delete the poll
    const result = await pollsDb.delete(pollId);

    if (!result.success) {
      throw new Error(result.error?.message || "Failed to delete poll");
    }

    // Revalidate the polls page
    revalidatePath("/polls");

    return { success: true };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}

/**
 * Server action to get poll results
 */
export async function getPollResultsAction(pollId: string) {
  try {
    if (!pollId) {
      throw new Error("Poll ID is required");
    }

    const result = await pollsDb.getResults(pollId);

    if (!result.success) {
      throw new Error(result.error?.message || "Failed to get poll results");
    }

    return result.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}

/**
 * Server action to get user's voting history for a poll
 */
export async function getUserVotesAction(pollId: string, userId: string) {
  try {
    if (!pollId) {
      throw new Error("Poll ID is required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    const result = await votesDb.getByUser(userId, pollId);

    if (!result.success) {
      throw new Error(result.error?.message || "Failed to get user votes");
    }

    return result.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}

/**
 * Server action to check if user has voted on a poll
 */
export async function checkUserVotedAction(pollId: string, userId: string) {
  try {
    if (!pollId) {
      throw new Error("Poll ID is required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    const result = await votesDb.hasUserVoted(pollId, userId);

    if (!result.success) {
      throw new Error(result.error?.message || "Failed to check voting status");
    }

    return result.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}
