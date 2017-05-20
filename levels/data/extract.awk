BEGIN {
   start = 0;
}
{
    if ($1 == "DATA" && id == $2) {
        start = 1;
    } else if ($1 == "END") {
        start = 0;
    } else if (start) {
        print "    "$0;
    }
}

