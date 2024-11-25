import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config();

// Helper function to get user input from the terminal
const prompt = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
};

class GitHubManager {
  private octokit: Octokit;

  constructor() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GitHub token not found. Please add it to the .env file.");
    }
    this.octokit = new Octokit({ auth: token });
  }

  // Fetch authenticated user's username
  async getAuthenticatedUsername(): Promise<string> {
    try {
      const response = await this.octokit.users.getAuthenticated();
      return response.data.login;
    } catch (error) {
      console.error("Error fetching authenticated username:", error);
      throw error;
    }
  }

  // Create a new repository
  async createRepository(repoName: string, isPrivate: boolean = true): Promise<void> {
    try {
      const response = await this.octokit.repos.createForAuthenticatedUser({
        name: repoName,
        private: isPrivate,
      });
      console.log(`Repository created: ${response.data.html_url}`);
    } catch (error) {
      console.error("Error creating repository:", error);
    }
  }

  // Delete a repository
  async deleteRepository(owner: string, repoName: string): Promise<void> {
    try {
      await this.octokit.repos.delete({
        owner,
        repo: repoName,
      });
      console.log(`Repository deleted: ${owner}/${repoName}`);
    } catch (error) {
      console.error("Error deleting repository:", error);
    }
  }

  // Add a collaborator to a repository
  async addUserToRepository(owner: string, repoName: string, username: string): Promise<void> {
    try {
      await this.octokit.repos.addCollaborator({
        owner,
        repo: repoName,
        username,
        permission: "push", // Default to pull/push access
      });
      console.log(`User ${username} added to ${owner}/${repoName} with push permission.`);
    } catch (error) {
      console.error("Error adding user to repository:", error);
    }
  }

  // Remove a collaborator from a repository
  async removeUserFromRepository(owner: string, repoName: string, username: string): Promise<void> {
    try {
      await this.octokit.repos.removeCollaborator({
        owner,
        repo: repoName,
        username,
      });
      console.log(`User ${username} removed from ${owner}/${repoName}.`);
    } catch (error) {
      console.error("Error removing user from repository:", error);
    }
  }
}

// Main Function
(async () => {
  const manager = new GitHubManager();
  const username = await manager.getAuthenticatedUsername();

  console.log(`Authenticated as: ${username}`);

  const actionInput = await prompt("What do you want to do? (create/edit repository): ");
  const action = actionInput.toLowerCase();

  if (action === "create") {
    const repoName = await prompt("Enter the name of the new repository: ");
    await manager.createRepository(repoName, true);

    while (true) {
      const collaborator = await prompt("Enter a collaborator's username (or press Enter to finish): ");
      if (!collaborator) break; // Exit the loop if no input
      await manager.addUserToRepository(username, repoName, collaborator);
    }

  } else if (action === "edit") {
    const repoName = await prompt("Enter the name of the repository to edit: ");
    const editActionInput = await prompt("What do you want to do? (add/remove collaborator or delete): ");
    const editAction = editActionInput.toLowerCase();

    if (editAction === "add") {
      while (true) {
        const collaborator = await prompt("Enter a collaborator's username (or press Enter to finish): ");
        if (!collaborator) break; // Exit the loop if no input
        await manager.addUserToRepository(username, repoName, collaborator);
      }
    } else if (editAction === "remove") {
      while (true) {
        const collaborator = await prompt("Enter the collaborator's username to remove (or press Enter to finish): ");
        if (!collaborator) break; // Exit the loop if no input
        await manager.removeUserFromRepository(username, repoName, collaborator);
      }
    } else if (editAction === "delete") {
      const confirm = await prompt("Are you sure you want to delete this repository? (yes/no): ");
      if (confirm.toLowerCase() === "yes") {
        await manager.deleteRepository(username, repoName);
      } else {
        console.log("Repository deletion canceled.");
      }
    } else {
      console.log("Invalid action. Please try again.");
    }

  } else {
    console.log("Invalid option. Please try again.");
  }

  console.log("Program completed.");
})();