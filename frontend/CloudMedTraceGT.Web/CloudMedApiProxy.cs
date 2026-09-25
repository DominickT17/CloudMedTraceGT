using System.Net.Http.Headers;

namespace CloudMedTraceGT.Web;

// El navegador usa su mismo origen. Solo Razor conoce la dirección interna de Django.
internal static class CloudMedApiProxy
{
    public static void Map(WebApplication app)
    {
        foreach (var resource in new[] { "medicamentos", "establecimientos", "lotes", "movimientos", "alertas" })
        {
            app.MapMethods($"/api/{resource}/{{id:int?}}", ["GET", "POST", "PUT", "PATCH", "DELETE"],
                (HttpContext context, IHttpClientFactory clients, int? id) =>
                    Forward(context, clients, resource + (id.HasValue ? $"/{id.Value}" : "") + "/"));
        }
        foreach (var path in new[] { "dashboard", "status", "lotes/buscar" })
            app.MapGet("/api/" + path + "/", (HttpContext context, IHttpClientFactory clients) =>
                Forward(context, clients, path + "/"));
        foreach (var resource in new[] { "trazabilidad", "verificar" })
            app.MapGet($"/api/{resource}/{{**numero}}", (HttpContext context, IHttpClientFactory clients, string numero) =>
                Forward(context, clients, resource + "/" + Uri.EscapeDataString(numero.TrimEnd('/')) + "/"));
    }

    private static async Task<IResult> Forward(HttpContext context, IHttpClientFactory clients, string path)
    {
        context.Response.Headers.CacheControl = "no-store";
        using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), path + context.Request.QueryString);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (context.Request.Method is "POST" or "PUT" or "PATCH")
        {
            request.Content = new StreamContent(context.Request.Body);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        }
        try
        {
            using var response = await clients.CreateClient("CloudMedApi").SendAsync(request, context.RequestAborted);
            if (response.StatusCode == System.Net.HttpStatusCode.NoContent) return Results.NoContent();
            return Results.Content(await response.Content.ReadAsStringAsync(context.RequestAborted),
                response.Content.Headers.ContentType?.ToString() ?? "application/json", statusCode: (int)response.StatusCode);
        }
        catch (Exception error) when (error is HttpRequestException or TaskCanceledException)
        {
            return Results.Json(new { detail = "API no disponible" }, statusCode: 503);
        }
    }
}
