namespace DirectoryLookup.Models;

public sealed class DirectoryUser
{
    public string Login { get; init; } = string.Empty;
    public string UserPrincipalName { get; init; } = string.Empty;
    public DirectoryNameAttributes Name { get; init; } = new();
    public IReadOnlyList<string> RoleMembership { get; init; } = [];
}
