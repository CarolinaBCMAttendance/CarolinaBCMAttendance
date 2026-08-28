# CarolinaBCMAttendance

Static group attendance app (`index.html`, `index.js`) plus a Windows-oriented Blazor directory lookup.

## Directory Lookup (Blazor)

Blazor Server app that looks up Active Directory users after a required domain is selected and at least 5 letters are typed.

Domains:

- `agf-test.local`
- `agfirst.net`
- `training.local`

Returned attributes:

- User login (`sAMAccountName`, `userPrincipalName`)
- Name attributes (`displayName`, `givenName`, `sn`, `cn`, `mail`, `title`, `department`, `distinguishedName`)
- Role membership (`memberOf` group common names)

### Run on Windows

Install the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0), then:

```bash
dotnet run --project src/DirectoryLookup
```

Open http://localhost:5035. In Development, sample directory data is used so the UI can be exercised without LDAP. On a domain-joined Windows machine, set `Directory:UseMock` to `false` in `src/DirectoryLookup/appsettings.json` (or `appsettings.Production.json`) to connect with the current Windows credentials.

Optional bind account (service account) environment variables:

- `Directory__BindUserName`
- `Directory__BindPassword`
- `Directory__BindDomain`

Publish a Windows x64 build:

```bash
dotnet publish src/DirectoryLookup -c Release -r win-x64 --self-contained true -o ./publish/win-x64
```

### Tests

```bash
dotnet test DirectoryLookup.sln
```
