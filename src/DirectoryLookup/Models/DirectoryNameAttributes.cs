namespace DirectoryLookup.Models;

public sealed class DirectoryNameAttributes
{
    public string DisplayName { get; init; } = string.Empty;
    public string GivenName { get; init; } = string.Empty;
    public string Surname { get; init; } = string.Empty;
    public string CommonName { get; init; } = string.Empty;
    public string Mail { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Department { get; init; } = string.Empty;
    public string DistinguishedName { get; init; } = string.Empty;
}
