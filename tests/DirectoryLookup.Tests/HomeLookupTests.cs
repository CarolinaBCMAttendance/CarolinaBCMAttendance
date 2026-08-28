using Bunit;
using DirectoryLookup.Components.Pages;
using DirectoryLookup.Models;
using DirectoryLookup.Options;
using DirectoryLookup.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace DirectoryLookup.Tests;

public class HomeLookupTests : TestContext
{
    [Fact]
    public void Domain_Dropdown_Defaults_To_Empty_Selection()
    {
        var fake = RegisterServices();
        var cut = RenderComponent<Home>();

        var select = cut.Find("#domain");
        Assert.Equal("", select.GetAttribute("value") ?? "");
        Assert.Contains("Select a domain", select.InnerHtml);
        Assert.Contains("agf-test.local", select.InnerHtml);
        Assert.Contains("agfirst.net", select.InnerHtml);
        Assert.Contains("training.local", select.InnerHtml);
        Assert.Equal(0, fake.CallCount);
    }

    [Fact]
    public void Five_Letters_Without_Domain_Does_Not_Search_And_Requires_Domain()
    {
        var fake = RegisterServices();
        var cut = RenderComponent<Home>();

        cut.Find("#search").Input("smith");

        cut.WaitForAssertion(() =>
        {
            Assert.Contains("A domain is required.", cut.Markup);
            Assert.Equal(0, fake.CallCount);
        });
    }

    [Fact]
    public void Four_Letters_Does_Not_Start_Background_Search()
    {
        var fake = RegisterServices();
        var cut = RenderComponent<Home>();

        cut.Find("#domain").Change("agfirst.net");
        cut.Find("#search").Input("smit");

        Assert.Equal(0, fake.CallCount);
        Assert.DoesNotContain("Connecting to", cut.Markup);
    }

    [Fact]
    public void Five_Letters_With_Domain_Searches_And_Shows_Login_Name_And_Roles()
    {
        var fake = RegisterServices();
        fake.Outcome = DirectorySearchOutcome.Success("agfirst.net",
        [
            new DirectoryUser
            {
                Login = "jsmith",
                UserPrincipalName = "jsmith@agfirst.net",
                Name = new DirectoryNameAttributes
                {
                    DisplayName = "Jane A. Smith",
                    GivenName = "Jane",
                    Surname = "Smith",
                    CommonName = "Jane Smith",
                    Mail = "jane.smith@agfirst.net",
                    Title = "Credit Analyst",
                    Department = "Credit",
                    DistinguishedName = "CN=Jane Smith,OU=Users,DC=agfirst,DC=net"
                },
                RoleMembership = ["Credit Analysts", "Domain Users"]
            }
        ]);

        var cut = RenderComponent<Home>();
        cut.Find("#domain").Change("agfirst.net");
        cut.Find("#search").Input("smith");

        cut.WaitForAssertion(() =>
        {
            Assert.Equal(1, fake.CallCount);
            Assert.Equal("agfirst.net", fake.LastDomain);
            Assert.Equal("smith", fake.LastSearch);
            Assert.Contains("jsmith", cut.Markup);
            Assert.Contains("Jane A. Smith", cut.Markup);
            Assert.Contains("Credit Analysts", cut.Markup);
            Assert.Contains("User login", cut.Markup);
            Assert.Contains("Name attributes", cut.Markup);
            Assert.Contains("Role membership", cut.Markup);
        }, TimeSpan.FromSeconds(3));
    }

    private FakeDirectorySearchService RegisterServices()
    {
        var fake = new FakeDirectorySearchService();
        Services.AddSingleton<IDirectorySearchService>(fake);
        Services.AddSingleton(Microsoft.Extensions.Options.Options.Create(new DirectoryOptions
        {
            UseMock = true,
            Domains = DirectoryOptions.CreateDefaultDomains()
        }));
        return fake;
    }

    private sealed class FakeDirectorySearchService : IDirectorySearchService
    {
        public int CallCount { get; private set; }
        public string? LastDomain { get; private set; }
        public string? LastSearch { get; private set; }
        public DirectorySearchOutcome Outcome { get; set; } =
            DirectorySearchOutcome.Success("agfirst.net", []);

        public Task<DirectorySearchOutcome> SearchAsync(string domainName, string searchText, CancellationToken cancellationToken = default)
        {
            CallCount++;
            LastDomain = domainName;
            LastSearch = searchText;
            return Task.FromResult(Outcome);
        }
    }
}
