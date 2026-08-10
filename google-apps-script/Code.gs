const UPLOAD_SECRET = "REPLACE_WITH_A_RANDOM_SECRET";

function doPost(e) {
  try {
    const input = JSON.parse(e.postData.contents);
    if (!input.secret || input.secret !== UPLOAD_SECRET) {
      return jsonResponse({ ok: false, error: "Unauthorized" });
    }
    if (!input.parentFolderId || !input.dateLabel || !input.filename || !input.mimeType || !input.base64) {
      return jsonResponse({ ok: false, error: "Missing upload fields" });
    }

    const parent = DriveApp.getFolderById(input.parentFolderId);
    const matches = parent.getFoldersByName(input.dateLabel);
    const folder = matches.hasNext() ? matches.next() : parent.createFolder(input.dateLabel);
    const blob = Utilities.newBlob(Utilities.base64Decode(input.base64), input.mimeType, input.filename);
    const file = folder.createFile(blob);

    return jsonResponse({ ok: true, id: file.getId(), webViewLink: file.getUrl() });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

