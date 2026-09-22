const retired =
  /^\/(?:gigs|topics|releases|login|logout|sessions|admin)(?:\/|$|\.html$)/;

const enrollment =
  /^\/events(?:\/|$|\.html$)/;

const settings =
  /^\/homes\/(?:option|workshop)(?:\/|$|\.html$)/;

const legacyPages = new Map([
  ['/homes/about', '/about'],
  ['/homes/show_1', '/session'],
  ['/homes/show_2', '/stage'],
  ['/homes/show_3', '/bands'],
  ['/homes/bands', '/bands'],
  ['/homes/band', '/band'],
  ['/homes/join', '/join']
]);


const BAND_IMAGE_API =
  '/api/band-image-ingest';

const BANDS_SYNC_API =
  '/api/bands-sync';

const BANDS_API =
  '/api/bands';

const BAND_MEDIA_PREFIX =
  '/media/';

const BANDS_DATA_KEY =
  'data/bands.json';


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
    JSON.stringify(
      data
    ),
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
          Allow:
            'POST'
        }
      }
    );
  }


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


  const driveUrl =
    'https://www.googleapis.com/drive/v3/files/' +
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


  const key =
    `bands/${safePart(responseId)}/` +
    `${Date.now()}.${extension}`;


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
          String(
            responseId
          ),

        source:
          'google-drive'
      }
    }
  );


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
 * Apps Script
 * ↓
 * POST /api/bands-sync
 * ↓
 * R2 data/bands.json
 */
async function handleBandsSync(
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
          Allow:
            'POST'
        }
      }
    );
  }


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


  if (
    !Array.isArray(
      data.bands
    )
  ) {

    return json(
      {
        ok: false,
        error: 'bands must be an array'
      },
      400
    );
  }


  /*
   * Worker側でも
   * 公開可能なフィールドだけに絞る
   */
  const bands =
    data.bands
      .map(
        band => ({

          id:
            String(
              band.id || ''
            ).trim(),

          name:
            String(
              band.name || ''
            ).trim(),

          members:
            Array.isArray(
              band.members
            )
              ? band.members
                  .map(
                    member =>
                      String(
                        member || ''
                      ).trim()
                  )
                  .filter(
                    Boolean
                  )
              : [],

          description:
            String(
              band.description || ''
            ).trim(),

          x:
            String(
              band.x || ''
            ).trim(),

          instagram:
            String(
              band.instagram || ''
            ).trim(),

          otherLinks:
            Array.isArray(
              band.otherLinks
            )
              ? band.otherLinks
                  .map(
                    link => ({

                      label:
                        String(
                          link?.label ||
                          'その他リンク'
                        ).trim() ||
                        'その他リンク',

                      url:
                        String(
                          link?.url || ''
                        ).trim()
                    })
                  )
                  .filter(
                    link =>
                      link.url
                  )
                  .slice(
                    0,
                    2
                  )
              : [],

          imageUrl:
            String(
              band.imageUrl || ''
            ).trim()
        })
      )
      .filter(
        band =>
          band.name &&
          band.id
      );


  const body =
    JSON.stringify({
      bands,

      updatedAt:
        new Date()
          .toISOString()
    });


  await env.BAND_IMAGES.put(
    BANDS_DATA_KEY,
    body,
    {
      httpMetadata: {

        contentType:
          'application/json; charset=utf-8',

        cacheControl:
          'no-store'
      },

      customMetadata: {

        source:
          'google-sheets'
      }
    }
  );


  return json({
    ok: true,

    count:
      bands.length
  });
}


/**
 * 公開バンド一覧API
 *
 * GET /api/bands
 */
async function handleBands(
  request,
  env,
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


  const object =
    await env.BAND_IMAGES.get(
      BANDS_DATA_KEY
    );


  if (!object) {

    const body =
      JSON.stringify({
        bands: [],
        updatedAt: null
      });


    return new Response(
      head
        ? null
        : body,
      {
        status: 200,

        headers: {

          'Content-Type':
            'application/json; charset=utf-8',

          'Cache-Control':
            'no-store'
        }
      }
    );
  }


  const text =
    await object.text();


  return new Response(
    head
      ? null
      : text,
    {
      status: 200,

      headers: {

        'Content-Type':
          'application/json; charset=utf-8',

        'Cache-Control':
          'no-store'
      }
    }
  );
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
      pathname,
      search
    } =
      new URL(
        request.url
      );


    if (
      pathname ===
      BANDS_SYNC_API
    ) {

      const response =
        await handleBandsSync(
          request,
          env
        );


      return headersFor(
        response,
        preview,
        head
      );
    }


    if (
      pathname ===
      BANDS_API
    ) {

      const response =
        await handleBands(
          request,
          env,
          head
        );


      return headersFor(
        response,
        preview,
        head
      );
    }


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

      const normalizedPath =
        pathname
          .replace(
            /\.html$/,
            ''
          )
          .replace(
            /\/$/,
            ''
          ) || '/';

      const legacyDestination =
        legacyPages.get(
          normalizedPath
        );


      if (legacyDestination) {

        destination =
          `${legacyDestination}${search}`;

      } else if (
        enrollment.test(
          pathname
        )
      ) {

        destination =
          '/join';

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