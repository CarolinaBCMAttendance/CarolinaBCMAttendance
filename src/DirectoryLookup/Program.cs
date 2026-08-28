using DirectoryLookup.Components;
using DirectoryLookup.Options;
using DirectoryLookup.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<DirectoryOptions>(builder.Configuration.GetSection(DirectoryOptions.SectionName));
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var useMock = builder.Configuration.GetValue<bool>($"{DirectoryOptions.SectionName}:UseMock");
if (useMock)
{
    builder.Services.AddSingleton<IDirectorySearchService, MockDirectorySearchService>();
}
else
{
    builder.Services.AddSingleton<IDirectorySearchService, LdapDirectorySearchService>();
}

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
app.UseAntiforgery();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
