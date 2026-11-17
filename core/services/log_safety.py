"""Helpers for writing URLs to the logs without leaking access to what they point at."""
from urllib.parse import urlsplit, urlunsplit


def loggable_url(url):
    """Return `url` without its query string or fragment, for log messages.

    A signed storage URL carries its access token in the query string: anyone who
    reads the full URL can open the file, for as long as the signature is valid.
    The scheme, host and path stay, which is what identifies the file when debugging.
    """
    if not url:
        return ''
    try:
        parts = urlsplit(str(url))
    except ValueError:
        return '<url illisible>'
    if not parts.query and not parts.fragment:
        return str(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, '', '')) + ' [paramètres masqués]'
