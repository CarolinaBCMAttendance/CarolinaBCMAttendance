using DirectoryLookup.Models;
using DirectoryLookup.Services;

namespace DirectoryLookup.Tests;

public class DirectorySearchQueryTests
{
    [Fact]
    public void CountLetters_Ignores_Digits_And_Spaces()
    {
        Assert.Equal(0, DirectorySearchQuery.CountLetters("1234"));
        Assert.Equal(4, DirectorySearchQuery.CountLetters("Jane"));
        Assert.Equal(5, DirectorySearchQuery.CountLetters("Jane S"));
        Assert.False(DirectorySearchQuery.HasMinimumLetters("abcd"));
        Assert.True(DirectorySearchQuery.HasMinimumLetters("abcde"));
    }

    [Theory]
    [InlineData("agfirst.net", "DC=agfirst,DC=net")]
    [InlineData("agf-test.local", "DC=agf-test,DC=local")]
    [InlineData("training.local", "DC=training,DC=local")]
    public void ToSearchBase_Builds_Dc_Path(string domain, string expected)
    {
        Assert.Equal(expected, DirectorySearchQuery.ToSearchBase(domain));
    }

    [Fact]
    public void BuildUserFilter_Escapes_Special_Characters()
    {
        var filter = DirectorySearchQuery.BuildUserFilter("a(b)*c");
        Assert.Contains(@"a\28b\29\2ac", filter);
        Assert.Contains("sAMAccountName=", filter);
        Assert.Contains("objectClass=user", filter);
    }
}

public class LdapFilterEncoderTests
{
    [Fact]
    public void Escape_Encodes_Ldap_Specials()
    {
        Assert.Equal(@"x\2a\28\29\5c", LdapFilterEncoder.Escape(@"x*()\"));
    }
}

public class DirectoryUserMapperTests
{
    [Fact]
    public void FromAttributes_Maps_Login_Name_And_Roles()
    {
        var user = DirectoryUserMapper.FromAttributes(new Dictionary<string, IReadOnlyList<string>>
        {
            ["sAMAccountName"] = ["jsmith"],
            ["userPrincipalName"] = ["jsmith@agfirst.net"],
            ["displayName"] = ["Jane A. Smith"],
            ["givenName"] = ["Jane"],
            ["sn"] = ["Smith"],
            ["cn"] = ["Jane Smith"],
            ["mail"] = ["jane.smith@agfirst.net"],
            ["title"] = ["Credit Analyst"],
            ["department"] = ["Credit"],
            ["distinguishedName"] = ["CN=Jane Smith,OU=Users,DC=agfirst,DC=net"],
            ["memberOf"] =
            [
                "CN=Credit Analysts,OU=Groups,DC=agfirst,DC=net",
                "CN=Domain Users,CN=Users,DC=agfirst,DC=net"
            ]
        });

        Assert.Equal("jsmith", user.Login);
        Assert.Equal("jsmith@agfirst.net", user.UserPrincipalName);
        Assert.Equal("Jane A. Smith", user.Name.DisplayName);
        Assert.Equal("Jane", user.Name.GivenName);
        Assert.Equal("Smith", user.Name.Surname);
        Assert.Equal(["Credit Analysts", "Domain Users"], user.RoleMembership);
    }
}

public class MockDirectorySearchServiceTests
{
    [Fact]
    public async Task SearchAsync_Requires_Domain_And_Five_Letters()
    {
        var service = new MockDirectorySearchService();

        var missingDomain = await service.SearchAsync("", "smith");
        Assert.False(missingDomain.Succeeded);

        var tooShort = await service.SearchAsync("agfirst.net", "smit");
        Assert.False(tooShort.Succeeded);
        Assert.Contains("5 letters", tooShort.Error);
    }

    [Fact]
    public async Task SearchAsync_Returns_Login_Name_Attributes_And_Roles()
    {
        var service = new MockDirectorySearchService();
        var outcome = await service.SearchAsync("agfirst.net", "smith");

        Assert.True(outcome.Succeeded);
        var user = Assert.Single(outcome.Users);
        Assert.Equal("jsmith", user.Login);
        Assert.Equal("Jane A. Smith", user.Name.DisplayName);
        Assert.Contains("Credit Analysts", user.RoleMembership);
    }

    [Fact]
    public async Task SearchAsync_Scopes_Results_To_Selected_Domain()
    {
        var service = new MockDirectorySearchService();
        var agFirst = await service.SearchAsync("agfirst.net", "smith");
        var test = await service.SearchAsync("agf-test.local", "smith");
        var training = await service.SearchAsync("training.local", "train");

        Assert.Equal("jsmith", Assert.Single(agFirst.Users).Login);
        Assert.Equal("tsmith", Assert.Single(test.Users).Login);
        Assert.Equal(2, training.Users.Count);
    }
}
