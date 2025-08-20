# resources/utils.py
def human_bytes(n: int) -> str:
    if n is None:
        return "-"
    step = 1024.0
    units = ["B","KB","MB","GB","TB"]
    i = 0
    x = float(n)
    while x >= step and i < len(units)-1:
        x /= step
        i += 1
    return f"{x:.1f} {units[i]}"
