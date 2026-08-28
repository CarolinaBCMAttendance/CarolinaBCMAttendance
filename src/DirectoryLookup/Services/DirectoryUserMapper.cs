using DirectoryLookup.Models;

namespace DirectoryLookup.Services;

public static class DirectoryUserMapper
{
    public static DirectoryUser FromAttributes(IReadOnlyDictionary<string, IReadOnlyList<string>> attributes)
    {
        var distinguishedName = First(attributes, "distinguishedName");
        var memberOf = Values(attributes, "memberOf");

        return new DirectoryUser
        {
            Login = First(attributes, "sAMAccountName"),
            UserPrincipalName = First(attributes, "userPrincipalName"),
            Name = new DirectoryNameAttributes
            {
                DisplayName = First(attributes, "displayName"),
                GivenName = First(attributes, "givenName"),
                Surname = First(attributes, "sn"),
                CommonName = First(attributes, "cn"),
                Mail = First(attributes, "mail"),
                Title = First(attributes, "title"),
                Department = First(attributes, "department"),
                DistinguishedName = distinguishedName
            },
            RoleMembership = ParseRoleMembership(memberOf)
        };
    }

    public static IReadOnlyList<string> ParseRoleMembership(IEnumerable<string> memberOf) =>
        memberOf
            .Select(ParseCommonName)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToArray();

    public static string? ParseCommonName(string distinguishedName)
    {
        if (string.IsNullOrWhiteSpace(distinguishedName))
        {
            return null;
        }

        var firstRdn = distinguishedName.Split(',')[0].Trim();
        if (firstRdn.StartsWith("CN=", StringComparison.OrdinalIgnoreCase))
        {
            return UnescapeDnValue(firstRdn[3..]);
        }

        return firstRdn;
    }

    private static string UnescapeDnValue(string value) =>
        value.Replace(@"\+", "+").Replace(@"\,", ",").Replace(@"\\", @"\");

    private static string First(IReadOnlyDictionary<string, IReadOnlyList<string>> attributes, string name) =>
        Values(attributes, name).FirstOrDefault() ?? string.Empty;

    private static IReadOnlyList<string> Values(IReadOnlyDictionary<string, IReadOnlyList<string>> attributes, string name)
    {
        foreach (var pair in attributes)
        {
            if (string.Equals(pair.Key, name, StringComparison.OrdinalIgnoreCase))
            {
                return pair.Value;
            }
        }

        return [];
    }
}
