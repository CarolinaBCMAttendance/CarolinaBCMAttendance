using System.ComponentModel.DataAnnotations;

namespace DirectoryLookup.Models;

public sealed class LookupFormModel
{
    [Required(ErrorMessage = "A domain is required.")]
    public string Domain { get; set; } = string.Empty;

    public string SearchText { get; set; } = string.Empty;
}
