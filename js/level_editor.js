var WALL = 0;
var OPEN = 1;
var GATE = 2;
var TEXT_BASED_DRAWING = 1;

var board = function(R, C, canvas_element_name, FONT, font_size = 12) {
    this.R             = R;  // #of rows
    this.C             = C;  // #of columns
    this.CANVAS_NAME   = canvas_element_name;
    this.cell_x        = 11; // Cell width in characters
    this.cell_y        = 5;  // Cell height in characters
    this.X_OFFSET      = 20;
    this.Y_OFFSET      = 20;
    this.ARENA_WIDTH   = 0;
    this.ARENA_HEIGHT  = 0;
    this.FONT          = FONT;
    this.FONT_SIZE     = font_size;
    this.WALL_CHAR     = "X";
    this.PATH_CHAR     = "#"; //"\u25FC"; Windows doesn't like unicode
    this.VERT_SEP_CHAR = ".";
    this.HORI_SEP_CHAR = ".";
    this.CHROME_HACK_X = this.X_OFFSET;
    this.CHROME_HACK_Y = this.Y_OFFSET;

    this.row_midpoints = new Array(this.R+1);
    for (let i = 0; i < this.R+1; ++i)
        this.row_midpoints[i] = new Array(this.C);
    this.col_midpoints = new Array(this.R);
    for (let i = 0; i < this.R; ++i)
        this.col_midpoints[i] = new Array(this.C+1);

    this.orig_row_data = new Array(this.R+1);
    for (let i = 0; i < this.R+1; ++i)
        this.orig_row_data[i] = new Array(this.C);

    this.orig_col_data = new Array(this.R);
    for (let i = 0; i < this.R; ++i)
        this.orig_col_data[i] = new Array(this.C+1);

    for (let i = 0; i < this.R+1; ++i) {
        for (let j = 0; j < this.C; ++j) {
            if (i == 0 || i == this.R)
                this.orig_row_data[i][j] = WALL;
            else
                this.orig_row_data[i][j] = OPEN;
        }
    }
    for (let i = 0; i < this.R; ++i) {
        for (let j = 0; j < this.C+1; ++j) {
            if (j == 0 || j == this.C)
                this.orig_col_data[i][j] = WALL;
            else
                this.orig_col_data[i][j] = OPEN;
        }
    }

    this.image_rows = this.R * this.cell_y + this.R+1;
    this.image_cols = this.C * this.cell_x + this.C+1 + 1;
    this.image = new Array(this.image_rows);
    for (let r = 0; r < this.image_rows; r++)
        this.image[r] = new Array(this.image_cols);

    // Drawing related stuff
    let sample_text       = new Array(10 + 1).join("X");
    this.font_dim         = MeasureText(sample_text, true, this.FONT, this.FONT_SIZE);
    let ctx_char_width    = this.font_dim[0] / sample_text.length;
    this.ARENA_WIDTH      = this.C * this.cell_x * ctx_char_width + (this.C + 2) * ctx_char_width; // this.C + 2 because vertical walls are 2-chars long
    this.ARENA_HEIGHT     = this.R * this.cell_y * this.font_dim[1] + (this.R + 1) * this.font_dim[1];
    this.canvas           = document.getElementById(this.CANVAS_NAME);
    this.canvas.width     = this.X_OFFSET + this.ARENA_WIDTH + ctx_char_width + this.CHROME_HACK_X;
    this.canvas.height    = this.Y_OFFSET + this.ARENA_HEIGHT + this.font_dim[1] + this.CHROME_HACK_Y;
    this.ctx              = this.canvas.getContext("2d");
    this.ctx.font         = "bold " + this.FONT_SIZE + "pt " + this.FONT;
    this.ctx.textBaseline = "hanging";
    this.ctx.fillStyle    = "black";

    this.Draw = function(row_data, col_data, update_state = true) {
        if (typeof row_data === "undefined")
            row_data = this.orig_row_data;
        if (typeof col_data == "undefined")
            col_data = this.orig_col_data;
        for (let r = 0; r < this.image_rows; ++r)
            for (let c = 0; c < this.image_cols; ++c)
                this.image[r][c] = " ";

        // Draw row grid
        for (let i = 0; i < this.R+1; i++) {
            for (let j = 0; j < this.C; j++) {
                let edge_type = row_data[i][j];
                let start_row = (this.cell_y+1) * i;
                let start_col = (this.cell_x+1) * j;
                if (edge_type === WALL) {
                    for (let a = start_col; a < start_col + this.cell_x + 2; ++a)
                       this.image[start_row][a] = this.WALL_CHAR;
                } else if (edge_type === OPEN) {
                    for (let a = start_col; a < start_col + this.cell_x + 2; ++a)
                        if (this.image[start_row][a] != this.WALL_CHAR) // if columns are drawn before rows
                            this.image[start_row][a] = this.HORI_SEP_CHAR;
                } else if (edge_type === GATE) {
                    for (let a = start_col; a < start_col + this.cell_x + 2; ++a) {
                        if ((a - start_col) < 4 || (a - start_col) > 8)
                            this.image[start_row][a] = this.WALL_CHAR;
                    }
                }
            }
        }

        // Draw column grid
        for (let i = 0; i < this.R; i++) {
            for (let j = 0; j < this.C+1; j++) {
                let edge_type = col_data[i][j];
                let start_row = (this.cell_y+1) * i;
                let start_col = (this.cell_x+1) * j;
                if (edge_type === WALL) {
                    for (let a = start_row; a < start_row + this.cell_y + 2; ++a) {
                        this.image[a][start_col] = this.WALL_CHAR;
                        if (TEXT_BASED_DRAWING)
                            this.image[a][start_col+1] = this.WALL_CHAR;
                    }
                } else if (edge_type === OPEN) {
                    for (let a = start_row; a < start_row + this.cell_y + 2; ++a)
                        if (this.image[a][start_col] != this.WALL_CHAR) // since rows are drawn before columns
                            this.image[a][start_col] = this.VERT_SEP_CHAR;
                } else if (edge_type === GATE) {
                    for (let a = start_row; a < start_row + this.cell_y + 2; ++a) {
                        if ((a - start_row) < 2 || (a - start_row) > 4) {
                            this.image[a][start_col] = this.WALL_CHAR;
                            if (TEXT_BASED_DRAWING)
                                this.image[a][start_col+1] = this.WALL_CHAR;
                        }
                    }
                }
            }
        }

        if (TEXT_BASED_DRAWING) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw the chequered squares FIRST
            let ctx_11_char_width = this.ctx.measureText("XXXXXXXXXXX").width;
            let ctx_char_width    = this.ctx.measureText("X").width;
            let rect_width        = ctx_11_char_width; //this.cell_x * this.font_dim[0];
            let rect_height       = this.cell_y * this.font_dim[1];
            let rect_y            = this.Y_OFFSET + this.font_dim[1];
            for (let i = 0; i < this.R; ++i) {
                let rect_x = this.X_OFFSET + ctx_char_width /*this.font_dim[0]*/;
                for (let j = 0; j < this.C; ++j) {
                    if ((i + j) % 2 === 0) {
                        this.ctx.fillStyle="rgba(236, 225, 200, 0.3)";
                    }
                    else {
                        this.ctx.fillStyle="rgba(213, 205, 177, 0.4)";
                    }
                    this.ctx.fillRect(rect_x, rect_y, rect_width, rect_height);
                    rect_x += (rect_width + ctx_char_width /*this.font_dim[0]*/);
                }
                rect_y += (rect_height + this.font_dim[1]);
            }

            // Now draw the walls and the path
            for (let i = 0; i < this.image_rows; ++i) {
                let text = "";
                for (let j = 0; j < this.image_cols; ++j)
                    text += this.image[i][j];
                //this.ctx.fillText(text, this.X_OFFSET, this.font_dim[1]*i + this.Y_OFFSET);
                this.ConvertTextToDrawing(text, this.font_dim[1]*i + this.Y_OFFSET);
                //console.log(text.length);
                //console.log(this.ctx.measureText(text).width);
            }
        }

        if (update_state) {
            this.CalculateSegmentMidpoints(this.ARENA_WIDTH, this.ARENA_HEIGHT);
            /*
            // NOTE - Deep copy is necessary
            for (let i = 0; i < this.R+1; ++i) {
                for (let j = 0; j < this.C; ++j) {
                    this.orig_row_data[i][j] = row_data[i][j];
                }
            }
            for (let i = 0; i < this.R; ++i) {
                for (let j = 0; j < this.C+1; ++j) {
                    this.orig_col_data[i][j] = col_data[i][j];
                }
            }
            */
        }
    };

    this.ConvertTextToDrawing = function(text, y) { // TODO - Work in progress
        // Character by character printing is way tool slow.
        // split the text into various components and then print
        let wall_chars = "";
        let path_chars = "";
        for (let i = 0; i < text.length; ++i) {
            if (text[i] == this.WALL_CHAR || text[i] == this.HORI_SEP_CHAR || text[i] == this.VERT_SEP_CHAR) {
                wall_chars += text[i];
                path_chars += " ";
            } else if (text[i] == this.PATH_CHAR) {
                wall_chars += " ";
                path_chars += this.PATH_CHAR;
            } else {
                wall_chars += text[i];
                path_chars += text[i];
            }
        }
        let x = this.X_OFFSET;
        this.ctx.fillStyle  = "rgba(0, 0, 0, 1)";
        this.ctx.fillText(wall_chars, x, y);
        this.ctx.fillStyle = "rgba(255, 0, 0, 1)";
        this.ctx.fillText(path_chars, x, y);
    };

    this.Redraw = function(row_data, col_data) {
        this.Draw(row_data, col_data, false);
    };

    this.CalculateSegmentMidpoints = function(board_width, board_height) {
        let hori_segment_len = board_width / this.C;
        let vert_segment_len = board_height / this.R;

        // Processing for the horizontal segments (rows)
        for (let i = 0; i < this.R+1; ++i) {
            for (let j = 0; j < this.C; ++j) {
                let mid_x = j * hori_segment_len + hori_segment_len / 2 + this.X_OFFSET;
                let mid_y = i * vert_segment_len + this.Y_OFFSET;
                this.row_midpoints[i][j] = {x: mid_x, y: mid_y};
                /* 
                this.ctx.beginPath();
                this.ctx.arc(mid_x, mid_y, 5, 0,2*Math.PI);
                this.ctx.stroke();
                this.ctx.closePath;
                */
            }
        }
        // Processing for the vertical segments (columns)
        for (let i = 0; i < this.R; ++i) {
            for (let j = 0; j < this.C+1; ++j) {
                let mid_x = j * hori_segment_len + this.X_OFFSET;
                let mid_y = i * vert_segment_len + vert_segment_len / 2 + this.Y_OFFSET;
                this.col_midpoints[i][j] = {x: mid_x, y: mid_y};
                /*
                this.ctx.beginPath();
                this.ctx.arc(mid_x, mid_y, 5, 0,2*Math.PI);
                this.ctx.stroke();
                this.ctx.closePath;
                */
            }
        }
    };


    this.Click = function(x, y) {
        // Determine the closest row or column segment
        let closest_to_col = false;
        let min_dist = Number.MAX_VALUE;
        let min_dist_loc = {r: -1, c: -1};
        for (let i = 0; i < this.R+1; ++i) {
            for (let j = 0; j < this.C; ++j) {
                let midpoint = this.row_midpoints[i][j];
                let dist = (midpoint.x - x)*(midpoint.x - x) + (midpoint.y - y)*(midpoint.y - y);
                if (dist < min_dist) {
                    min_dist_loc.r = i;
                    min_dist_loc.c = j;
                    closest_to_col = false;
                    min_dist = dist;
                }
            }
        }
        for (let i = 0; i < this.R; ++i) {
            for (let j = 0; j < this.C+1; ++j) {
                let midpoint = this.col_midpoints[i][j];
                let dist = (midpoint.x - x)*(midpoint.x - x) + (midpoint.y - y)*(midpoint.y - y);
                if (dist < min_dist) {
                    min_dist_loc.r = i;
                    min_dist_loc.c = j;
                    closest_to_col = true;
                    min_dist = dist;
                }
            }
        }

        //console.log("{x, y} = {" + x + "," + y + "}");
        //console.log("closest to a column? " + closest_to_col);
        //console.log("{r, c} = ", min_dist_loc);
        //console.log("min_dist = ", min_dist);

        if (!closest_to_col) { // player clicked on a row
            let r = min_dist_loc.r;
            let c = min_dist_loc.c;
            if (this.orig_row_data[r][c] == OPEN)
                this.orig_row_data[r][c] = WALL;
            else if (this.orig_row_data[r][c] == WALL)
                this.orig_row_data[r][c] = GATE;
            else
                this.orig_row_data[r][c] = OPEN;
        } else { // player clicked on a column
            let r = min_dist_loc.r;
            let c = min_dist_loc.c;
            if (this.orig_col_data[r][c] == OPEN)
                this.orig_col_data[r][c] = WALL;
            else if (this.orig_col_data[r][c] == WALL)
                this.orig_col_data[r][c] = GATE;
            else
                this.orig_col_data[r][c] = OPEN;
        }
        this.Redraw(this.orig_row_data, this.orig_col_data);
    };

    this.PrintData = function() {
        let str = "let R = " + this.R + ";";
        //console.log(str);
        $('#rc_data').val("DATA " + "\n" + str);
        str = "let C = " + this.C + ";";
        //console.log(str);
        $('#rc_data').val($('#rc_data').val() + "\n" + str);
        str = "let row_data = [";
        for (let i = 0; i < this.R+1; ++i) {
            str += "[";
            for (let j = 0; j < this.C; ++j) {
                str += this.orig_row_data[i][j].toString();
                if (j != this.C-1)
                    str += ", ";
            }
            if (i != this.R)
                str += "], ";
            else
                str += "]";
        }
        str += "];";
        //console.log(str);
        $('#rc_data').val($('#rc_data').val() + "\n" + str);

        str = "let col_data = [";
        for (let i = 0; i < this.R; ++i) {
            str += "[";
            for (let j = 0; j < this.C+1; ++j) {
                str += this.orig_col_data[i][j].toString();
                if (j != this.C)
                    str += ", ";
            }
            if (i != this.R-1)
                str += "], ";
            else
                str += "]";
        }
        str += "];";
        //console.log(str);
        $('#rc_data').val($('#rc_data').val() + "\n" + str);
        $('#rc_data').val($('#rc_data').val() + "\n" + "END");

    };
};

