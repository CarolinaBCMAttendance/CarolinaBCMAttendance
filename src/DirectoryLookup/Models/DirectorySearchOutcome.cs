namespace DirectoryLookup.Models;

public sealed class DirectorySearchOutcome
{
    public bool Succeeded { get; init; }
    public string Domain { get; init; } = string.Empty;
    public string? Error { get; init; }
    public IReadOnlyList<DirectoryUser> Users { get; init; } = [];

    public static DirectorySearchOutcome Success(string domain, IReadOnlyList<DirectoryUser> users) =>
        new()
        {
            Succeeded = true,
            Domain = domain,
            Users = users
        };

    public static DirectorySearchOutcome Fail(string domain, string error) =>
        new()
        {
            Succeeded = false,
            Domain = domain,
            Error = error
        };
}
