const root = "https://raw.githubusercontent.com/KITASHA/SQU-App/main/public/images";
const img = (name, alt) => '<img class="feature-image" src="' + root + '/' + name + '" alt="' + alt + '" loading="lazy">';
const feature = (title, paragraphs, name, reverse = false) => '<section class="feature ' + (reverse ? "feature-reverse" : "") + '"><div><h2>' + title + '</h2><p class="preserve-lines">' + paragraphs + '</p></div>' + img(name, title) + '</section>';

export function homePage() {
  return '<section class="hero"><p class="eyebrow">Okayama A Cappella Circle</p><h1>SQUARE</h1><p>「誰でも入れるアカペラサークル」をコンセプトとして、アカペラを始めたい人が集まる広場のようなサークルです。</p><p><a class="button" href="/homes/about">SQUAREをもっと知る</a></p></section>' +
    '<section class="image-links">' +
    '<a class="image-link" href="/homes/about">' + img("about_image_1.png", "SQUAREについて") + '<span>SQUAREについて</span></a>' +
    '<a class="image-link" href="/homes/show_2">' + img("image_2.jpg", "Okayama Music SQUARE") + '<span>Okayama Music SQUARE</span></a>' +
    '<a class="image-link" href="https://www.youtube.com/channel/UCpcjVaT57zyOhB92BROiTBA" rel="noopener noreferrer">' + img("image_4.jpg", "活動の様子") + '<span>活動の様子を動画で見る</span></a>' +
    '<a class="image-link" href="/bands">' + img("image_5.jpg", "バンド紹介") + '<span>バンド紹介</span></a>' +
    '<a class="image-link" href="/gigs">' + img("image_8.jpg", "出演情報") + '<span>出演情報</span></a></section>';
}

export function aboutPage() {
  return '<article class="content-page"><h1>SQUAREについて</h1>' +
    feature("コンセプト — 誰でも気軽に入れるアカペラサークル", "岡山にはアカペラに興味がある未経験者がたくさんいたのに、アカペラサークルがなかったという設立の経緯から、このコンセプトを掲げました。\n\n未経験者・経験者を問わず入会でき、県外のメンバーもたくさんいます。\n\nアカペラを始めたい人たちが集まる「広場」のような場所をイメージし、「SQUARE」と名付けました。", "about_image_1.png") +
    feature("基本方針", "SQUAREは出会いの場です。SQUAREで出会った人同士でバンドを組み、基本的に自分たちで練習していくイメージです。\n\n初めてアカペラの世界に足を踏み込む方も多いため、基礎的な情報発信や導入段階を支える仕組みも作っています。\n\n自分たちがパフォーマンスをする場を、みんなで協力して作ることもSQUAREの重要な役割です。", "about_image_2.jpg", true) +
    feature("活動費・年会費", "年会費は2,000円です。（半年ごとに1,000円を徴収。前期：11〜4月、後期：5〜10月）\n\n定期活動会へ参加する際は別途800円をいただいています。\n\n事情により活動しづらくなった場合は休止も選択できます。（年会費なし・定期活動会参加費1,500円）", "about_image_7.jpg") +
    related() + '</article>';
}

export function regularActivityPage() {
  return '<article class="content-page"><h1>定期活動会</h1>' +
    feature("毎月開催するメインの活動", "月に一回集まり、事前に共有した楽譜で歌います。同じ楽譜をいろいろなチームが歌うイメージです。\n\n当日に少し練習し、バンドごとに発表します。和気あいあいとアカペラを楽しんでいます。", "show_1_image.jpg") +
    feature("メンバー同士の顔合わせの場", "ハモリは二の次で、顔合わせとフランクにアカペラを楽しむことが目的です。\n\n参加者には「今日は一切ハモらなくてかまいません！」とお伝えしています。気軽に音楽を楽しみ、新しくバンドを組むきっかけにしてもらえればと思っています。", "show_2_image.jpg", true) +
    related() + '</article>';
}

export function musicSquarePage() {
  return '<article class="content-page"><h1>Okayama Music SQUARE</h1>' +
    feature("SQUARE主催のストリートイベント", "岡山に定期的にアカペラを披露するステージが欲しいという思いから始まりました。\n\n音楽に接点のない方にもシーンを知ってもらい、プレイヤーには気軽にステージへ立てる場として知ってもらえれば幸いです。", "image_2.jpg") +
    feature("アカペラだけにこだわらない", "アカペラは音楽を楽しむための演奏手法の一つだと考えています。アカペラ以外の音楽も幅広く募集しています。\n\n出演希望の方は公式SNSのDMからご連絡ください。", "about_image_8.jpg", true) +
    feature("動画で見る", "これまでのステージをYouTubeへ掲載しています。ぜひご覧ください。", "image_4.jpg") +
    '<p><a class="button" href="https://www.youtube.com/@square5877/playlists" rel="noopener noreferrer">YouTubeプレイリスト</a></p>' + related() + '</article>';
}

export function starterBandPage() {
  return '<article class="content-page"><h1>スターターバンド制度</h1>' +
    feature("入ってすぐでもバンドが組めるよう、お手伝いします", "始めたばかりの人が最初に組む期間限定バンドを作るためのアシスト制度です。\n\n既存メンバーと新メンバーを交えてバンドを作るため、初めての方でも安心して参加できます。SQUARE内で用意した楽譜も利用できます。\n\nOkayama Music SQUAREで披露した後も、話し合って活動を継続できます。", "about_image_6.jpg") + related() + '</article>';
}

export function workshopPage() {
  return '<article class="content-page"><h1>発声ワークショップ動画</h1><div class="grid"><a class="panel" href="https://www.youtube.com/playlist?list=PLzago6UsCqmTwSAficfa4hW28TT7TsbP0" rel="noopener noreferrer">LeeさんWS @ 2024年11月</a><a class="panel" href="https://www.youtube.com/playlist?list=PLzago6UsCqmSz7mHW87ociKg6EpgTTmjP" rel="noopener noreferrer">LeeさんWS @ 2023年6月</a></div></article>';
}

function related() {
  return '<nav class="related"><a href="/homes/about">SQUAREについて</a><a href="/homes/show_1">定期活動会</a><a href="/homes/show_2">Okayama Music SQUARE</a><a href="/homes/show_3">スターターバンド制度</a></nav>';
}
