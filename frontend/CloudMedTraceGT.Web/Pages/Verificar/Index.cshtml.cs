using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using QRCoder;

namespace CloudMedTraceGT.Web.Pages.Verificar;

[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class IndexModel(IHttpClientFactory clients, IConfiguration configuration) : PageModel
{
    public string Lote { get; private set; } = "";
    public string VerificationUrl { get; private set; } = "";
    public bool IsLoopback { get; private set; }

    private Uri PublicBase()
    {
        var value = configuration["PublicBaseUrl"];
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            (uri.Scheme != "http" && uri.Scheme != "https") ||
            !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Query) ||
            !string.IsNullOrEmpty(uri.Fragment) || value.Length > 300)
            throw new InvalidOperationException("Configura PublicBaseUrl con una URL HTTP válida.");
        return uri;
    }

    private string VerificationLink(string lote) => PublicBase().AbsoluteUri.TrimEnd('/') +
        "/Verificar?lote=" + Uri.EscapeDataString(lote);

    public IActionResult OnGet(string? lote)
    {
        Lote = lote?.Trim() ?? "";
        if (Lote.Length > 100) return BadRequest("El número de lote es demasiado largo.");
        VerificationUrl = VerificationLink(Lote);
        IsLoopback = PublicBase().IsLoopback;
        return Page();
    }

    // Solo lectura y solo los cinco campos públicos. Django permanece en loopback.
    public async Task<IActionResult> OnGetDatosAsync(string? lote)
    {
        if (string.IsNullOrWhiteSpace(lote) || lote.Trim().Length > 100)
            return new JsonResult(new { detail = "Indica un número de lote válido." }) { StatusCode = 400 };
        try
        {
            using var response = await clients.CreateClient("CloudMedApi")
                .GetAsync("verificar/" + Uri.EscapeDataString(lote.Trim()) + "/");
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return new JsonResult(new { detail = "Lote no encontrado" }) { StatusCode = 404 };
            if (!response.IsSuccessStatusCode) return Unavailable();
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var data = json.RootElement;
            return new JsonResult(new {
                medicamento = data.GetProperty("medicamento").GetString(),
                presentacion = data.GetProperty("presentacion").GetString(),
                numero_lote = data.GetProperty("numero_lote").GetString(),
                fecha_vencimiento = data.GetProperty("fecha_vencimiento").GetString(),
                estado = data.GetProperty("estado").GetString()
            });
        }
        catch (Exception error) when (error is HttpRequestException or TaskCanceledException or JsonException or KeyNotFoundException or InvalidOperationException)
        {
            return Unavailable();
        }
    }

    private JsonResult Unavailable() => new(new { detail = "API no disponible" }) { StatusCode = 503 };

    public IActionResult OnGetEnlace(string? lote)
    {
        if (string.IsNullOrWhiteSpace(lote) || lote.Trim().Length > 100) return BadRequest();
        return new JsonResult(new { url = VerificationLink(lote.Trim()), local = PublicBase().IsLoopback });
    }

    public IActionResult OnGetQr(string? lote, bool descargar = false)
    {
        if (string.IsNullOrWhiteSpace(lote) || lote.Trim().Length > 100) return BadRequest();
        using var data = QRCodeGenerator.GenerateQrCode(VerificationLink(lote.Trim()), QRCodeGenerator.ECCLevel.M);
        using var qr = new PngByteQRCode(data);
        var bytes = qr.GetGraphic(8);
        var name = "QR_" + System.Text.RegularExpressions.Regex.Replace(lote.Trim(), @"[^\p{L}\p{N}_-]", "_") + ".png";
        return descargar ? File(bytes, "image/png", name) : File(bytes, "image/png");
    }
}
