namespace DirectoryLookup.Services;

public static class DirectorySearchQuery
{
    public const int MinimumLetterCount = 5;

    public static readonly string[] Attributes =
    [
        "sAMAccountName",
        "userPrincipalName",
        "givenName",
        "sn",
        "displayName",
        "cn",
        "mail",
        "title",
        "department",
        "distinguishedName",
        "memberOf"
    ];

    public static int CountLetters(string? value) =>
        string.IsNullOrEmpty(value) ? 0 : value.Count(char.IsLetter);

    public static bool HasMinimumLetters(string? value) =>
        CountLetters(value) >= MinimumLetterCount;

    public static string ToSearchBase(string domainName)
    {
        var parts = domainName.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
        {
            throw new ArgumentException("A domain name is required.", nameof(domainName));
        }

        return string.Join(',', parts.Select(part => $"DC={part}"));
    }

    public static string BuildUserFilter(string searchText)
    {
        var escaped = LdapFilterEncoder.Escape(searchText.Trim());
        return
            $"(&(objectCategory=person)(objectClass=user)(!(objectClass=computer))" +
            $"(|(sAMAccountName={escaped}*)(userPrincipalName={escaped}*)" +
            $"(displayName={escaped}*)(cn={escaped}*)(givenName={escaped}*)(sn={escaped}*)))";
    }

    public static string ResolveSearchBase(DirectoryLookup.Options.DirectoryDomainOptions domain) =>
        string.IsNullOrWhiteSpace(domain.SearchBase)
            ? ToSearchBase(domain.Name)
            : domain.SearchBase;
}
