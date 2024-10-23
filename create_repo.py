from github import Github

# Initialize the GitHub client with your Personal Access Token
GITHUB_TOKEN = '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'
github = Github(GITHUB_TOKEN)

def create_repository():
    # Prompt user for repository name
    repo_name = input("Enter the name of the new GitHub repository: ")
    description = input("Enter a description for the repository (optional): ")
    is_private = input("Do you want the repository to be private? (yes/no): ").lower() == 'yes'
    
    # Create the repository
    try:
        user = github.get_user()
        repo = user.create_repo(
            name=repo_name,
            description=description,
            private=is_private
        )
        print(f'Repository "{repo_name}" created successfully! URL: {repo.html_url}')
        
        # Prompt for GitHub username to invite as a collaborator
        invite_user = input("Do you want to invite someone to this repository? (yes/no): ").lower() == 'yes'
        if invite_user:
            username = input("Enter the GitHub username to invite: ")
            invite_collaborator(repo, username)
            
    except Exception as e:
        print(f'Error: {e}')

def invite_collaborator(repo, username):
    try:
        # Add the collaborator to the repository
        repo.add_to_collaborators(username, permission='push')
        print(f'Invitation sent to {username} for repository "{repo.name}".')
    except Exception as e:
        print(f'Error inviting {username}: {e}')

if __name__ == '__main__':
    create_repository()