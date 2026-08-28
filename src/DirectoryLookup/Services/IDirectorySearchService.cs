using DirectoryLookup.Models;

namespace DirectoryLookup.Services;

public interface IDirectorySearchService
{
    Task<DirectorySearchOutcome> SearchAsync(string domainName, string searchText, CancellationToken cancellationToken = default);
}
