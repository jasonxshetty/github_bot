import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";

dotenv.config();
/**
 * A class to manage GitHub repositories and collaborators.
 */
class GitHubManager {
  private octokit: Octokit;
  /**
   * Initializes a new instance of the `GitHubManager` class.
   * Reads the GitHub token from the `.env` file and authenticates with Octokit.
   * @throws Will throw an error if the `GITHUB_TOKEN` is not found.
   */
  constructor() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GitHub token not found. Please add it to the .env file.");
    }
    this.octokit = new Octokit({ auth: token });
  }
  /**
   * Retrieves the username of the authenticated GitHub user.
   * @returns A promise that resolves to the authenticated user's username.
   * @throws Will throw an error if the request fails.
   */
  // get authenticated user's username
  async getAuthenticatedUsername(): Promise<string> {
    try {
      const response = await this.octokit.users.getAuthenticated();
      return response.data.login;
    } catch (error) {
      console.error("Error fetching authenticated username:", error);
      throw error;
    }
  }
  /**
   * Checks if a repository exists for the specified owner and repository name.
   * @param owner - The owner of the repository.
   * @param repoName - The name of the repository.
   * @returns A promise that resolves to `true` if the repository exists, otherwise `false`.
   * @throws Will throw an error for issues other than a 404.
   */
  // Check if a repository exists
  async repositoryExists(owner: string, repoName: string): Promise<boolean> {
    try {
      await this.octokit.repos.get({
        owner,
        repo: repoName,
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      } else {
        console.error("Error checking repository existence:", error);
        throw error;
      }
    }
  }
  /**
   * Creates a new GitHub repository for the authenticated user.
   * @param repoName - The name of the repository to create.
   * @param isPrivate - Whether the repository should be private. Defaults to `true`.
   * @returns A promise that resolves when the repository is created.
   * @throws Will throw an error if the repository creation fails.
   */
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
  /**
   * Adds a collaborator to a GitHub repository.
   * @param owner - The owner of the repository.
   * @param repoName - The name of the repository.
   * @param username - The GitHub username of the collaborator to add.
   * @returns A promise that resolves when the collaborator is added.
   * @throws Will throw an error if adding the collaborator fails.
   */
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
      console.error(`Error adding user ${username} to repository:`, error);
    }
  }
  /**
   * Removes a collaborator from a GitHub repository.
   * @param owner - The owner of the repository.
   * @param repoName - The name of the repository.
   * @param username - The GitHub username of the collaborator to remove.
   * @returns A promise that resolves when the collaborator is removed.
   * @throws Will throw an error if removing the collaborator fails.
   */
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
      console.error(`Error removing user ${username} from repository:`, error);
    }
  }
  /**
   * Lists all collaborators of a GitHub repository.
   * @param owner - The owner of the repository.
   * @param repoName - The name of the repository.
   * @returns A promise that resolves to an array of GitHub usernames of the collaborators.
   * @throws Will throw an error if listing collaborators fails.
   */
  // List collaborators of a repository
  async listCollaborators(owner: string, repoName: string): Promise<string[]> {
    try {
      const response = await this.octokit.repos.listCollaborators({
        owner,
        repo: repoName,
      });
      return response.data.map((collaborator) => collaborator.login);
    } catch (error) {
      console.error("Error listing collaborators:", error);
      throw error;
    }
  }
}
/**
 * Prompts the user to input a file path.
 * @param query - The prompt message to display to the user.
 * @returns A promise that resolves to the input file path.
 */
// Helper function to prompt for file path
const promptFilePath = async (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
};

// Main Function
(async () => {
  const manager = new GitHubManager();
  const username = await manager.getAuthenticatedUsername();

  console.log(`Authenticated as: ${username}`);

  const filePath = await promptFilePath("Enter the JSON file path: ");
  /**
   * Parses the JSON file containing team information.
   * The file must include `teamName` (string) and `collaborators` (array of strings).
   */
  // Read and parse the JSON file
  let teamData;
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    teamData = JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading or parsing JSON file:", error);
    return;
  }

  const { teamName, collaborators } = teamData;

  if (!teamName || !Array.isArray(collaborators)) {
    console.error("Invalid JSON format. Please provide 'teamName' and 'collaborators' array.");
    return;
  }
  /**
   * Checks if the repository exists and updates or creates it as needed.
   * Adds or removes collaborators based on the JSON file data.
   */
  const repoExists = await manager.repositoryExists(username, teamName);

  if (repoExists) {
    console.log(`Repository '${teamName}' exists. Updating collaborators...`);

    // Get current collaborators
    const currentCollaborators = await manager.listCollaborators(username, teamName);

    // Normalize usernames to lowercase for case-insensitive comparison
    const normalizedCurrentCollaborators = currentCollaborators.map((collab) => collab.toLowerCase());
    const normalizedCollaborators = collaborators.map((collab: string) => collab.toLowerCase());
    const normalizedUsername = username.toLowerCase();

    // Determine collaborators to add and remove
    const collaboratorsToAdd = normalizedCollaborators.filter(
      (collab) => !normalizedCurrentCollaborators.includes(collab)
    );
    const collaboratorsToRemove = normalizedCurrentCollaborators.filter(
      (collab) => !normalizedCollaborators.includes(collab) && collab !== normalizedUsername // Do not remove the repo owner
    );

    // Add new collaborators
    for (const collab of collaboratorsToAdd) {
      await manager.addUserToRepository(username, teamName, collab);
    }

    // Remove collaborators not in the JSON file
    for (const collab of collaboratorsToRemove) {
      await manager.removeUserFromRepository(username, teamName, collab);
    }

    console.log("Collaborators updated.");

  } else {
    console.log(`Repository '${teamName}' does not exist. Creating repository and adding collaborators...`);
    await manager.createRepository(teamName, true);

    // Add collaborators
    for (const collab of collaborators) {
      await manager.addUserToRepository(username, teamName, collab);
    }

    console.log("Repository created and collaborators added.");
  }

  console.log("Program completed.");
})();