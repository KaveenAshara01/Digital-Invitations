# Phase 3: private media

The editor's **Media** panel uploads JPEG, PNG and WebP photos (8 MB), MP4 video (40 MB) and MP3 audio (10 MB). Maximum: 20 files per invitation, 100 files / 250 MB per account, including pending uploads. Media changes save immediately; content and styling autosave after a short pause. Enable the Gallery section to display media. The first photo doubles as the video poster. Playback uses native controls, with no automatic video or music playback.

## Configure Cloudflare R2

1. Create a private R2 bucket. Keep public access disabled.
2. Create an Object Read & Write API token scoped to that bucket.
3. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET_NAME` in `.env`. Credentials stay server-side. A public base URL is unnecessary for private drafts.
4. Add this bucket CORS policy, substituting your actual development and production origins:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.example"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Stop the development server, run `npm run db:deploy` and `npm run db:generate`, then `npm run dev`.
6. Open a private draft, choose Media, and upload a small photo. Enable Gallery under Sections and save. Reload to check persistence. Duplicate the draft and remove the photo from the original: it should remain in the copy.

Presigned browser uploads require a matching Content-Type and bucket CORS configuration; see [Cloudflare's presigned URL documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) and [CORS documentation](https://developers.cloudflare.com/r2/buckets/cors/).

## Storage and access

Uploads use random server-generated keys, a five-minute signed PUT URL bound to content type and length and a pending database record. Completion checks actual size, content type and file header. Conditional reads/copies tie validation to the same object version, then copy to a separate private key that the upload URL cannot overwrite. Only ready assets appear in previews. Header checks identify format, but do not prove the entire file decodes or enforce H.264 codecs. Browser playback errors may indicate unsupported encoding.

Private preview URLs expire after one hour: reload the editor to renew them. Anyone holding a signed URL can read that particular file until expiry; do not share private preview URLs. Ownership and same-origin checks protect upload, completion and removal. Duplicating invitations shares asset references, without copying the underlying media. Removing an invitation or file detaches references; physical deletion is deferred for safe cleanup.

Run `npm run media:cleanup` daily on a trusted server with database/R2 environment values. It removes expired pending uploads after a one-hour grace period and ready assets over one day old with no references. Database locks and foreign keys protect referenced assets. A failed cleanup can be retried. Add a bucket lifecycle rule that expires `pending/` objects after one day, including uploads repeated using an old signed URL. Keep the database metadata until cleanup completes. Account deletion and publication snapshots must preserve asset metadata/references in their later implementation.

## Prepare lightweight files

R2 stores files; this application does not transcode them. Resize photos before uploading and use WebP where possible. Encode short video to H.264/AAC with fast-start metadata, for example:

```sh
ffmpeg -i input.mov -vf "scale='min(1280,iw)':-2" -c:v libx264 -crf 26 -preset medium -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart invitation.mp4
ffmpeg -i input.wav -c:a libmp3lame -b:a 128k invitation.mp3
```

Select several files at once in Media to upload them in sequence. Each successful upload is saved immediately; a failed file is reported by name while the remaining files continue. The 20-file invitation limit still applies.

The Media panel also offers optional invitation music, with three bundled wedding-style instrumental recordings by Kevin MacLeod, free under CC BY 4.0. See `public/music/CREDITS.md` for recording sources and licensing. Music choice autosaves with the draft. Invitation music always loops behind a compact mute/unmute button. Playback is attempted on opening; browsers may require a guest interaction before allowing sound. Artist credits are available under Music credits in the footer. Built-in music works even when Gallery is hidden and does not require R2. Select My uploaded music to use the first uploaded licensed MP3 as background music. Switching music off hides uploaded audio too. Upload music you own or are licensed to use. Audio uses `preload="none"` before playback is attempted; gallery images load lazily. Live R2 uploads require configured credentials and the manual bucket check above.

## Usage and costs

As checked on 2026-10-10, R2 Standard includes 10 GB-month of storage, 1 million Class A operations and 10 million Class B operations monthly. Above those allowances, storage and operations are billed; see [current Cloudflare pricing](https://developers.cloudflare.com/r2/pricing/). Monitor bucket storage and operation counts in the R2 dashboard and configure Cloudflare billing alerts. Upload validation uses multiple reads and a copy, so one upload consumes multiple operations. Application quotas are per account, not a global billing cap.
