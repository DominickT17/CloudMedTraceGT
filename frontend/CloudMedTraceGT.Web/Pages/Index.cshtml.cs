using Microsoft.AspNetCore.Mvc.RazorPages;

namespace CloudMedTraceGT.Web.Pages;

public class IndexModel(IConfiguration configuration) : PageModel
{
    public string ApiStatusUrl { get; } =
        $"{configuration["CloudMedApi:BaseUrl"]?.TrimEnd('/')}/api/status/";

    public void OnGet() { }
}
