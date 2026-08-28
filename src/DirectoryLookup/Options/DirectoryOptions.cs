namespace DirectoryLookup.Options;

public sealed class DirectoryOptions
{
    public const string SectionName = "Directory";

    public bool UseMock { get; set; }

    public int ConnectTimeoutSeconds { get; set; } = 8;

    public int SizeLimit { get; set; } = 50;

    public string? BindUserName { get; set; }

    public string? BindPassword { get; set; }

    public string? BindDomain { get; set; }

    public List<DirectoryDomainOptions> Domains { get; set; } = CreateDefaultDomains();

    public static List<DirectoryDomainOptions> CreateDefaultDomains() =>
    [
        new() { Name = "agf-test.local" },
        new() { Name = "agfirst.net" },
        new() { Name = "training.local" }
    ];
}

public sealed class DirectoryDomainOptions
{
    public string Name { get; set; } = string.Empty;

    public string? Host { get; set; }

    public int Port { get; set; } = 389;

    public bool UseSsl { get; set; }

    public string? SearchBase { get; set; }

    public string HostName => string.IsNullOrWhiteSpace(Host) ? Name : Host;
}
