using Microsoft.AspNetCore.Mvc.RazorPages;

namespace CloudMedTraceGT.Web.Pages.Trazabilidad;

public class IndexModel(IConfiguration configuration) : PageModel
{
    public string ApiBaseUrl { get; } =
        configuration["CloudMedApi:BaseUrl"]?.TrimEnd('/') ?? "";

    public void OnGet() { }
}
