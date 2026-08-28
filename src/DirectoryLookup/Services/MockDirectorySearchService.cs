using DirectoryLookup.Models;
using DirectoryLookup.Options;
using Microsoft.Extensions.Options;

namespace DirectoryLookup.Services;

public sealed class MockDirectorySearchService : IDirectorySearchService
{
    private readonly IReadOnlyList<DirectoryDomainOptions> _domains;
    private readonly IReadOnlyList<SampleDirectoryUser> _users;

    public MockDirectorySearchService(IOptions<DirectoryOptions> options)
        : this(options.Value.Domains) { }

    public MockDirectorySearchService(IEnumerable<DirectoryDomainOptions>? domains = null)
    {
        _domains = (domains ?? DirectoryOptions.CreateDefaultDomains()).ToArray();
        _users = CreateSampleUsers();
    }

    public async Task<DirectorySearchOutcome> SearchAsync(string domainName, string searchText, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(domainName))
        {
            return DirectorySearchOutcome.Fail(domainName, "A domain is required.");
        }

        if (!_domains.Any(domain => string.Equals(domain.Name, domainName, StringComparison.OrdinalIgnoreCase)))
        {
            return DirectorySearchOutcome.Fail(domainName, $"Unknown domain: {domainName}");
        }

        if (!DirectorySearchQuery.HasMinimumLetters(searchText))
        {
            return DirectorySearchOutcome.Fail(
                domainName,
                $"Enter at least {DirectorySearchQuery.MinimumLetterCount} letters before searching.");
        }

        await Task.Delay(150, cancellationToken);

        var prefix = searchText.Trim();
        var matches = _users
            .Where(user => string.Equals(user.Domain, domainName, StringComparison.OrdinalIgnoreCase))
            .Where(user => Matches(user, prefix))
            .Select(user => user.ToDirectoryUser())
            .ToArray();

        return DirectorySearchOutcome.Success(domainName, matches);
    }

    private static bool Matches(SampleDirectoryUser user, string prefix) =>
        StartsWith(user.Login, prefix) ||
        StartsWith(user.UserPrincipalName, prefix) ||
        StartsWith(user.DisplayName, prefix) ||
        StartsWith(user.GivenName, prefix) ||
        StartsWith(user.Surname, prefix) ||
        StartsWith(user.CommonName, prefix);

    private static bool StartsWith(string value, string prefix) =>
        value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);

    private static IReadOnlyList<SampleDirectoryUser> CreateSampleUsers() =>
    [
        new(
            "agfirst.net",
            "jsmith",
            "jsmith@agfirst.net",
            "Jane A. Smith",
            "Jane",
            "Smith",
            "Jane Smith",
            "jane.smith@agfirst.net",
            "Credit Analyst",
            "Credit",
            "CN=Jane Smith,OU=Users,DC=agfirst,DC=net",
            ["Domain Users", "Credit Analysts", "Report Readers"]),
        new(
            "agfirst.net",
            "alee",
            "alee@agfirst.net",
            "Amanda Lee",
            "Amanda",
            "Lee",
            "Amanda Lee",
            "amanda.lee@agfirst.net",
            "Branch Manager",
            "Retail",
            "CN=Amanda Lee,OU=Users,DC=agfirst,DC=net",
            ["Domain Users", "Managers", "Credit Committee"]),
        new(
            "agf-test.local",
            "tuser",
            "tuser@agf-test.local",
            "Test User",
            "Test",
            "User",
            "Test User",
            "test.user@agf-test.local",
            "QA Analyst",
            "Quality Assurance",
            "CN=Test User,OU=Users,DC=agf-test,DC=local",
            ["Domain Users", "Test Admins"]),
        new(
            "agf-test.local",
            "tsmith",
            "tsmith@agf-test.local",
            "Taylor Smith",
            "Taylor",
            "Smith",
            "Taylor Smith",
            "taylor.smith@agf-test.local",
            "Test Developer",
            "Information Technology",
            "CN=Taylor Smith,OU=Users,DC=agf-test,DC=local",
            ["Domain Users", "Developers"]),
        new(
            "training.local",
            "trainee",
            "trainee@training.local",
            "Training User",
            "Training",
            "User",
            "Training User",
            "training.user@training.local",
            "Trainee",
            "Learning",
            "CN=Training User,OU=Users,DC=training,DC=local",
            ["Domain Users", "Training Participants"]),
        new(
            "training.local",
            "tadmin",
            "tadmin@training.local",
            "Training Admin",
            "Training",
            "Admin",
            "Training Admin",
            "training.admin@training.local",
            "Instructor",
            "Learning",
            "CN=Training Admin,OU=Users,DC=training,DC=local",
            ["Domain Users", "Training Instructors"])
    ];

    private sealed record SampleDirectoryUser(
        string Domain,
        string Login,
        string UserPrincipalName,
        string DisplayName,
        string GivenName,
        string Surname,
        string CommonName,
        string Mail,
        string Title,
        string Department,
        string DistinguishedName,
        IReadOnlyList<string> Roles)
    {
        public DirectoryUser ToDirectoryUser() =>
            new()
            {
                Login = Login,
                UserPrincipalName = UserPrincipalName,
                Name = new DirectoryNameAttributes
                {
                    DisplayName = DisplayName,
                    GivenName = GivenName,
                    Surname = Surname,
                    CommonName = CommonName,
                    Mail = Mail,
                    Title = Title,
                    Department = Department,
                    DistinguishedName = DistinguishedName
                },
                RoleMembership = Roles
            };
    }
}
