import { createPollAction, updatePollAction } from "../lib/poll-actions";
import { pollsDb } from "../lib/database/polls";

// Mock the database modules
jest.mock("../lib/database/polls", () => ({
  pollsDb: {
    create: jest.fn(),
    update: jest.fn(),
  },
  votesDb: {}, // Not needed for these specific tests
}));

// Mock Next.js modules
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

const mockedPollsDb = pollsDb as jest.Mocked<typeof pollsDb>;

describe("Poll Server Actions - Form Data Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Tests for createPollAction form data parsing
  describe("createPollAction Form Data Parsing", () => {
    it("should correctly parse all standard fields from FormData", async () => {
      const formData = new FormData();
      formData.append("title", "My Test Poll");
      formData.append("description", "A detailed description.");
      formData.append("expires_at", "2099-01-01T00:00:00Z");
      formData.append("allow_multiple_votes", "on");
      formData.append("is_anonymous", "on");
      formData.append("max_votes_per_user", "5");
      formData.append("user_id", "user_form_test_123");
      formData.append("option_0", "First Option");
      formData.append("option_1", "Second Option");

      mockedPollsDb.create.mockResolvedValue({
        success: true,
        data: { id: "poll_form_123" } as any,
      });

      await createPollAction(formData);

      expect(mockedPollsDb.create).toHaveBeenCalledWith(
        {
          title: "My Test Poll",
          description: "A detailed description.",
          expires_at: "2099-01-01T00:00:00Z",
          allow_multiple_votes: true,
          is_anonymous: true,
          max_votes_per_user: 5,
          options: ["First Option", "Second Option"],
        },
        "user_form_test_123",
      );
    });

    it('should handle unchecked checkboxes where the value is not "on"', async () => {
      const formData = new FormData();
      formData.append("title", "Checkbox Test");
      formData.append("option_0", "A");
      formData.append("option_1", "B");
      // 'allow_multiple_votes' is not present, simulating an unchecked box
      formData.append("is_anonymous", "false"); // or any value other than 'on'

      mockedPollsDb.create.mockResolvedValue({
        success: true,
        data: { id: "poll_checkbox" } as any,
      });

      await createPollAction(formData);

      expect(mockedPollsDb.create).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_multiple_votes: false,
          is_anonymous: false,
        }),
        undefined,
      );
    });

    it("should stop parsing options at the first missing sequential index", async () => {
      const formData = new FormData();
      formData.append("title", "Complex Options Test");
      formData.append("option_0", "Option 1");
      // option_1 is intentionally skipped
      formData.append("option_2", "Option 3");
      formData.append("option_3", "Option 4");

      // Expect the action to throw an error because only 'Option 1' will be parsed,
      // and thus there will be less than 2 options for poll creation.
      await expect(createPollAction(formData)).rejects.toThrow(
        "Poll must have at least 2 options",
      );

      // Ensure pollsDb.create was NOT called since validation should fail before it.
      expect(mockedPollsDb.create).not.toHaveBeenCalled();
    });
  });

  // Tests for updatePollAction form data parsing
  describe("updatePollAction Form Data Parsing", () => {
    it("should correctly parse a partial update with mixed field types", async () => {
      const formData = new FormData();
      formData.append("title", "Updated Title");
      formData.append("is_anonymous", "on");
      // Note: 'description' is not present, so it shouldn't be in the update object
      formData.append("max_votes_per_user", "10");

      mockedPollsDb.update.mockResolvedValue({
        success: true,
        data: { id: "poll_update_abc" } as any,
      });

      await updatePollAction("poll_update_abc", formData);

      const updatePayload = mockedPollsDb.update.mock.calls[0][1];

      expect(updatePayload).toEqual({
        title: "Updated Title",
        is_anonymous: true,
        max_votes_per_user: 10,
      });
      expect(updatePayload).not.toHaveProperty("description");
    });

    it("should correctly parse an empty description as a request to set it to undefined", async () => {
      const formData = new FormData();
      formData.append("description", "");

      mockedPollsDb.update.mockResolvedValue({
        success: true,
        data: { id: "poll_update_desc" } as any,
      });

      await updatePollAction("poll_update_desc", formData);

      expect(mockedPollsDb.update).toHaveBeenCalledWith("poll_update_desc", {
        description: undefined,
      });
    });

    it("should only include fields that are explicitly present in the form data", async () => {
      const formData = new FormData();
      formData.append("title", "Only Title Is Here");

      mockedPollsDb.update.mockResolvedValue({
        success: true,
        data: { id: "poll_update_single" } as any,
      });

      await updatePollAction("poll_update_single", formData);

      const updatePayload = mockedPollsDb.update.mock.calls[0][1];

      expect(updatePayload).toHaveProperty("title", "Only Title Is Here");
      expect(Object.keys(updatePayload)).toHaveLength(1); // Ensure no other keys are present
      expect(updatePayload).not.toHaveProperty("description");
      expect(updatePayload).not.toHaveProperty("is_active");
      expect(updatePayload).not.toHaveProperty("is_anonymous");
    });
  });
});
