using System.DirectoryServices.Protocols;
using System.Net;
using DirectoryLookup.Models;
using DirectoryLookup.Options;
using Microsoft.Extensions.Options;

namespace DirectoryLookup.Services;

public sealed class LdapDirectorySearchService : IDirectorySearchService
{
    private readonly DirectoryOptions _options;
    private readonly ILogger<LdapDirectorySearchService> _logger;

    public LdapDirectorySearchService(IOptions<DirectoryOptions> options, ILogger<LdapDirectorySearchService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public Task<DirectorySearchOutcome> SearchAsync(string domainName, string searchText, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(domainName))
        {
            return Task.FromResult(DirectorySearchOutcome.Fail(domainName, "A domain is required."));
        }

        if (!DirectorySearchQuery.HasMinimumLetters(searchText))
        {
            return Task.FromResult(DirectorySearchOutcome.Fail(
                domainName,
                $"Enter at least {DirectorySearchQuery.MinimumLetterCount} letters before searching."));
        }

        return Task.Run(() => Search(domainName, searchText, cancellationToken), cancellationToken);
    }

    private DirectorySearchOutcome Search(string domainName, string searchText, CancellationToken cancellationToken)
    {
        var domain = ResolveDomain(domainName);

        try
        {
            using var connection = CreateConnection(domain);
            cancellationToken.ThrowIfCancellationRequested();
            connection.Bind();

            var request = new SearchRequest(
                DirectorySearchQuery.ResolveSearchBase(domain),
                DirectorySearchQuery.BuildUserFilter(searchText),
                SearchScope.Subtree,
                DirectorySearchQuery.Attributes)
            {
                SizeLimit = Math.Max(1, _options.SizeLimit)
            };

            cancellationToken.ThrowIfCancellationRequested();
            var response = (SearchResponse)connection.SendRequest(request);
            var users = new List<DirectoryUser>(response.Entries.Count);
            foreach (SearchResultEntry entry in response.Entries)
            {
                var user = MapEntry(entry);
                if (!string.IsNullOrWhiteSpace(user.Login) || !string.IsNullOrWhiteSpace(user.Name.DisplayName))
                {
                    users.Add(user);
                }
            }

            return DirectorySearchOutcome.Success(domain.Name, users);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Directory search failed for {Domain}", domain.Name);
            return DirectorySearchOutcome.Fail(
                domain.Name,
                $"Could not connect to {domain.Name}: {exception.Message}");
        }
    }

    private LdapConnection CreateConnection(DirectoryDomainOptions domain)
    {
        var identifier = new LdapDirectoryIdentifier(domain.HostName, domain.Port, fullyQualifiedDnsHostName: true, connectionless: false);
        var connection = new LdapConnection(identifier)
        {
            AuthType = AuthType.Negotiate,
            Timeout = TimeSpan.FromSeconds(Math.Max(1, _options.ConnectTimeoutSeconds))
        };

        connection.SessionOptions.ProtocolVersion = 3;
        connection.SessionOptions.ReferralChasing = ReferralChasingOptions.None;
        connection.SessionOptions.SecureSocketLayer = domain.UseSsl;

        if (!string.IsNullOrWhiteSpace(_options.BindUserName))
        {
            connection.Credential = new NetworkCredential(
                _options.BindUserName,
                _options.BindPassword,
                _options.BindDomain);
        }
        else
        {
            connection.Credential = CredentialCache.DefaultNetworkCredentials;
        }

        return connection;
    }

    private DirectoryDomainOptions ResolveDomain(string domainName)
    {
        var match = _options.Domains.FirstOrDefault(domain =>
            string.Equals(domain.Name, domainName, StringComparison.OrdinalIgnoreCase));

        return match ?? new DirectoryDomainOptions { Name = domainName };
    }

    private static DirectoryUser MapEntry(SearchResultEntry entry)
    {
        var attributes = new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (string attributeName in entry.Attributes.AttributeNames)
        {
            var attribute = entry.Attributes[attributeName];
            var values = new List<string>(attribute.Count);
            for (var index = 0; index < attribute.Count; index++)
            {
                if (attribute[index]?.ToString() is { Length: > 0 } value)
                {
                    values.Add(value);
                }
            }

            attributes[attribute.Name] = values;
        }

        if (!attributes.ContainsKey("distinguishedName") && !string.IsNullOrWhiteSpace(entry.DistinguishedName))
        {
            attributes["distinguishedName"] = [entry.DistinguishedName];
        }

        return DirectoryUserMapper.FromAttributes(attributes);
    }
}
