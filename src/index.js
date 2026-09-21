const retired =
  /^\/(?:bands|gigs|topics|releases|login|logout|sessions|admin)(?:\/|$|\.html$)/;

const enrollment =
  /^\/events(?:\/|$|\.html$)/;

const settings =
  /^\/homes\/(?:option|workshop)(?:\/|$|\.html$)/;


const BAND_IMAGE_API =
  '/api/band-image-ingest';

const BAND_MEDIA_PREFIX =
  '/media/';


function headersFor(
  response,
  preview,
  head
) {

  const headers =
    new Headers(
      response.headers
    );


  headers.set(
    'X-Content-Type-Options',
    'nosniff'
  );


  headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );


  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );


  headers.set(
    'X-Frame-Options',
    'DENY'
  );


  if (preview) {

    headers.set(
      'X-Robots-Tag',
      'noindex, nofollow'
    );
  }


  return new Response(
    head
      ? null
      : response.body,
    {
      status:
        response.status,

      statusText:
        response.statusText,

      headers
    }
  );
}


function json(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        'Content-Type':
          'application/json; charset=utf-8',

        'Cache-Control':
          'no-store'
      }
    }
  );
}


function safePart(
  value
) {

  return String(
    value || ''
  )
    .replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    )
    .slice(
      0,
      120
    );
}


function getExtension(
  fileName,
  mimeType
) {

  const match =
    String(
      fileName || ''
    ).match(
      /\.([a-zA-Z0-9]{1,8})$/
    );


  if (match) {

    return match[1]
      .toLowerCase();
  }


  const extensions = {

    'image/jpeg':
      'jpg',

    'image/png':
      'png',

    'image/webp':
      'webp',

    'image/gif':
      'gif',

    'image/heic':
      'heic',

    'image/heif':
      'heif'
  };


  return (
    extensions[mimeType] ||
    'bin'
  );
}


/**
 * Apps Script
 * ↓
 * Worker
 * ↓
 * Google Drive
 * ↓
 * R2
 */
async function handleBandImage(
  request,
  env
) {

  if (
    request.method !==
    'POST'
  ) {

    return new Response(
      'Method Not Allowed',
      {
        status: 405,

        headers: {
          Allow: 'POST'
        }
      }
    );
  }


  /*
   * Apps ScriptとWorkerだけが知っている
   * Secretで認証
   */
  const suppliedSecret =
    request.headers.get(
      'X-SQUARE-INGEST-SECRET'
    );


  if (
    !env.BAND_INGEST_SECRET ||
    suppliedSecret !==
      env.BAND_INGEST_SECRET
  ) {

    return json(
      {
        ok: false,
        error: 'Unauthorized'
      },
      401
    );
  }


  let data;


  try {

    data =
      await request.json();

  } catch {

    return json(
      {
        ok: false,
        error: 'Invalid JSON'
      },
      400
    );
  }


  /*
   * R2削除
   */
  if (
    data.action ===
    'delete'
  ) {

    const key =
      String(
        data.key || ''
      );


    if (
      !key.startsWith(
        'bands/'
      )
    ) {

      return json(
        {
          ok: false,
          error: 'Invalid key'
        },
        400
      );
    }


    await env.BAND_IMAGES.delete(
      key
    );


    return json({
      ok: true
    });
  }


  /*
   * R2保存
   */
  const {
    responseId,
    fileId,
    fileName,
    mimeType,
    previousKey,
    googleAccessToken
  } = data;


  if (
    !responseId ||
    !fileId ||
    !googleAccessToken
  ) {

    return json(
      {
        ok: false,
        error:
          'responseId, fileId, googleAccessToken are required'
      },
      400
    );
  }


  /*
   * WorkerがGoogle Driveから
   * 元画像を直接取得
   */
  const driveUrl =
    `https://www.googleapis.com/drive/v3/files/` +
    `${encodeURIComponent(fileId)}` +
    '?alt=media';


  const source =
    await fetch(
      driveUrl,
      {
        headers: {

          Authorization:
            `Bearer ${googleAccessToken}`
        }
      }
    );


  if (
    !source.ok ||
    !source.body
  ) {

    return json(
      {
        ok: false,

        error:
          `Google Drive download failed: ${source.status}`
      },
      502
    );
  }


  const contentType =
    source.headers.get(
      'Content-Type'
    ) ||
    mimeType ||
    'application/octet-stream';


  const extension =
    getExtension(
      fileName,
      contentType
    );


  /*
   * 1回答 = 専用ディレクトリ
   *
   * bands/
   *   回答ID/
   *     1726900000000.jpg
   */
  const key =
    `bands/${safePart(responseId)}/` +
    `${Date.now()}.${extension}`;


  /*
   * 重要
   *
   * arrayBuffer()しない
   *
   * Google Driveから届いた
   * ReadableStreamをそのままR2へ渡す
   *
   * 100MB画像でもWorkerメモリに
   * 全部載せない
   */
  await env.BAND_IMAGES.put(
    key,
    source.body,
    {
      httpMetadata: {

        contentType,

        cacheControl:
          'public, max-age=31536000, immutable'
      },

      customMetadata: {

        responseId:
          String(responseId),

        source:
          'google-drive'
      }
    }
  );


  /*
   * 新画像保存成功後
   * 古い画像を削除
   */
  if (
    previousKey &&
    previousKey !== key &&
    String(
      previousKey
    ).startsWith(
      'bands/'
    )
  ) {

    await env.BAND_IMAGES.delete(
      previousKey
    );
  }


  const origin =
    new URL(
      request.url
    ).origin;


  return json({

    ok: true,

    key,

    url:
      `${origin}${BAND_MEDIA_PREFIX}${key}`
  });
}


/**
 * R2画像表示
 *
 * /media/bands/...
 */
async function handleMedia(
  request,
  env,
  pathname,
  head
) {

  if (
    request.method !==
      'GET' &&
    !head
  ) {

    return new Response(
      'Method Not Allowed',
      {
        status: 405,

        headers: {
          Allow:
            'GET, HEAD'
        }
      }
    );
  }


  const key =
    pathname.slice(
      BAND_MEDIA_PREFIX.length
    );


  if (
    !key ||
    !key.startsWith(
      'bands/'
    )
  ) {

    return new Response(
      'Not Found',
      {
        status: 404
      }
    );
  }


  const object =
    await env.BAND_IMAGES.get(
      key
    );


  if (!object) {

    return new Response(
      'Not Found',
      {
        status: 404
      }
    );
  }


  const headers =
    new Headers();


  object.writeHttpMetadata(
    headers
  );


  headers.set(
    'ETag',
    object.httpEtag
  );


  headers.set(
    'Cache-Control',
    'public, max-age=31536000, immutable'
  );


  return new Response(
    head
      ? null
      : object.body,
    {
      status: 200,
      headers
    }
  );
}


export default {

  async fetch(
    request,
    env
  ) {

    const preview =
      env.PREVIEW ===
      'true';


    const head =
      request.method ===
      'HEAD';


    const {
      pathname
    } =
      new URL(
        request.url
      );


    /*
     * Google Apps Script
     * → R2登録
     */
    if (
      pathname ===
      BAND_IMAGE_API
    ) {

      const response =
        await handleBandImage(
          request,
          env
        );


      return headersFor(
        response,
        preview,
        head
      );
    }


    /*
     * R2画像配信
     */
    if (
      pathname.startsWith(
        BAND_MEDIA_PREFIX
      )
    ) {

      const response =
        await handleMedia(
          request,
          env,
          pathname,
          head
        );


      return headersFor(
        response,
        preview,
        head
      );
    }


    /*
     * 既存サイト処理
     */
    let response;


    if (
      request.method !==
        'GET' &&
      !head
    ) {

      response =
        new Response(
          'Method Not Allowed',
          {
            status: 405,

            headers: {
              Allow:
                'GET, HEAD'
            }
          }
        );

    } else {

      let destination;


      if (
        enrollment.test(
          pathname
        )
      ) {

        destination =
          '/homes/join';

      } else if (
        retired.test(
          pathname
        ) ||
        settings.test(
          pathname
        )
      ) {

        destination =
          '/';
      }


      if (destination) {

        response =
          new Response(
            null,
            {
              status: 301,

              headers: {
                Location:
                  destination
              }
            }
          );

      } else {

        response =
          await env.ASSETS.fetch(
            request
          );
      }
    }


    return headersFor(
      response,
      preview,
      head
    );
  }
};