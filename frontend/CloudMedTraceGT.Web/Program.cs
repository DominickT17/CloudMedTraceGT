var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRazorPages();
var apiUrl = builder.Configuration["CloudMedApi:BaseUrl"];
if (!Uri.TryCreate(apiUrl, UriKind.Absolute, out var apiUri) ||
    (apiUri.Scheme != "http" && apiUri.Scheme != "https"))
    throw new InvalidOperationException("Configura CloudMedApi:BaseUrl con una URL HTTP válida.");
builder.Services.AddHttpClient("CloudMedApi", client =>
{
    client.BaseAddress = new Uri(apiUrl!.TrimEnd('/') + "/api/");
    client.Timeout = TimeSpan.FromSeconds(6);
});
var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
    app.UseHttpsRedirection();
}

// Archivos físicos de wwwroot; asp-append-version conserva caché por ?v=.
app.UseStaticFiles();
app.UseRouting();
CloudMedTraceGT.Web.CloudMedApiProxy.Map(app);
app.MapRazorPages();
app.Run();
