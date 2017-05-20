var WALL = 0;
var OPEN = 1;
var GATE = 2;
var PATH = 3;
var EXIT = 4;
var FROZEN_PATH = 5;
var FROZEN_EXIT = 6;
var TEXT_BASED_DRAWING = 1;
var DOUBLE_WIDTH_VERT_WALL = 1;

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
    this.WALL_CHAR     = "/";
    this.PATH_CHAR     = "#"; //"\u25FC"; Windows doesn't like unicode
    this.LOCKED_P_CHAR = "X";
    this.VERT_SEP_CHAR = ".";
    this.HORI_SEP_CHAR = ".";
    this.CHROME_HACK_X = this.X_OFFSET;
    this.CHROME_HACK_Y = 0; //this.Y_OFFSET;

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

    this.curr_row_data = new Array(this.R+1);
    for (let i = 0; i < this.R+1; ++i)
        this.curr_row_data[i] = new Array(this.C);
    this.curr_col_data = new Array(this.R);
    for (let i = 0; i < this.R; ++i)
        this.curr_col_data[i] = new Array(this.C+1);

    this.image_rows = this.R * this.cell_y + this.R+1;
    this.image_cols = this.C * this.cell_x + this.C+1 + 1;
    this.image = new Array(this.image_rows);
    for (let r = 0; r < this.image_rows; r++)
        this.image[r] = new Array(this.image_cols);


    this.res = new Array(this.R);
    for (let i = 0; i < this.R; ++i)
        this.res[i] = new Array(this.C);
    for (let i = 0; i < this.R; ++i)
        for (let j = 0; j < this.C; ++j)
            this.res[i][j] = 0;
    this.adj_list = new Array(this.R * this.C);
    this.colormap = new Array(this.R * this.C);

    this.ClickLog = [];

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
    //this.ctx.shadowBlur   = 10;      // shadows slow things down
    //this.ctx.shadowColor  = "brown";
    this.ctx.fillStyle    = "black";
    //this.ctx.setLineDash([1, 16]);

    this.Draw = function(row_data, col_data, update_state = true) {

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
                } else if (edge_type == PATH || edge_type == FROZEN_PATH) {
                    let disp_ch = (edge_type == PATH) ? this.PATH_CHAR : this.LOCKED_P_CHAR;
                    for (let a = start_col; a < start_col + this.cell_x + 2; ++a)
                        if (this.image[start_row][a] != this.WALL_CHAR)
                            this.image[start_row][a] = this.HORI_SEP_CHAR;
                    for (let b = start_row-3; b <= start_row+3; ++b)
                        this.image[b][start_col+6] = disp_ch;
                } else if (edge_type == EXIT || edge_type == FROZEN_EXIT) {
                    let disp_ch = (edge_type == EXIT) ? this.PATH_CHAR : this.LOCKED_P_CHAR;
                    for (let a = start_col; a < start_col + this.cell_x + 2; ++a)
                        if ((a - start_col) < 4 || (a - start_col) > 8)
                            this.image[start_row][a] = this.WALL_CHAR;
                    for (let b = start_row-3; b <= start_row+3; ++b)
                        if (b >= 0 && b < this.image_rows)
                            this.image[b][start_col+6] = disp_ch;
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
                        if (DOUBLE_WIDTH_VERT_WALL)
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
                            if (DOUBLE_WIDTH_VERT_WALL)
                                this.image[a][start_col+1] = this.WALL_CHAR;
                        }
                    }
                } else if (edge_type == PATH || edge_type == FROZEN_PATH) {
                    let disp_ch = (edge_type == PATH) ? this.PATH_CHAR : this.LOCKED_P_CHAR;
                    for (let a = start_row; a < start_row + this.cell_y + 2; ++a)
                        if (this.image[a][start_col] != this.WALL_CHAR)
                            this.image[a][start_col] = this.VERT_SEP_CHAR;
                    let alternate = 0;
                    for (let b = start_col-6; b <= start_col+6; ++b) {
                        if (alternate === 0)
                            this.image[start_row+3][b] = disp_ch;
                        else
                            this.image[start_row+3][b] = " ";
                        alternate = 1 - alternate;
                    }
                } else if (edge_type == EXIT || edge_type == FROZEN_EXIT) {
                    let disp_ch = (edge_type == EXIT) ? this.PATH_CHAR : this.LOCKED_P_CHAR;
                    for (let a = start_row; a < start_row + this.cell_y + 2; ++a) {
                        if ((a - start_row) < 2 || (a - start_row) > 4) {
                            this.image[a][start_col] = this.WALL_CHAR;
                            if (DOUBLE_WIDTH_VERT_WALL)
                                this.image[a][start_col+1] = this.WALL_CHAR;
                        }
                    }
                    let alternate = 0;
                    for (let b = start_col-6; b <= start_col+6; ++b) {
                        if (b >= 0 && b < this.image_cols) {
                            if (alternate === 0)
                                this.image[start_row+3][b] = disp_ch;
                            else
                                this.image[start_row+3][b] = " ";
                            alternate = 1 - alternate;
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
                    if ((i + j) % 2) {
                        if (this.res[i][j] == 2)
                            this.ctx.fillStyle="rgba(94, 93, 155, 0.35)";
                        else
                            this.ctx.fillStyle="rgba(94, 93, 87, 0.3)";
                    }
                    else {
                        if (this.res[i][j] == 2)
                            this.ctx.fillStyle="rgba(130, 126, 155, 0.45)";
                        else
                            this.ctx.fillStyle="rgba(130, 126, 110, 0.4)";
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
        } else { // TODO - Work in progress
        }

        if (update_state) {
            this.CalculateSegmentMidpoints(this.ARENA_WIDTH, this.ARENA_HEIGHT);
            // NOTE - Deep copy is necessary
            for (let i = 0; i < this.R+1; ++i) {
                for (let j = 0; j < this.C; ++j) {
                    this.orig_row_data[i][j] = row_data[i][j];
                    this.curr_row_data[i][j] = row_data[i][j];
                }
            }
            for (let i = 0; i < this.R; ++i) {
                for (let j = 0; j < this.C+1; ++j) {
                    this.orig_col_data[i][j] = col_data[i][j];
                    this.curr_col_data[i][j] = col_data[i][j];
                }
            }
        }
    };

    this.ConvertTextToDrawing = function(text, y) { // TODO - Work in progress
        // Character by character printing is way tool slow.
        // split the text into various components and then print
        let wall_chars = "";
        let path_chars = "";
        let dots_chars = "";
        for (let i = 0; i < text.length; ++i) {
            if (text[i] == this.WALL_CHAR || text[i] == this.LOCKED_P_CHAR) {
                wall_chars += text[i];
                path_chars += " ";
                dots_chars += " ";
            } else if (text[i] == this.HORI_SEP_CHAR || text[i] == this.VERT_SEP_CHAR) {
                wall_chars += " ";
                path_chars += " ";
                dots_chars += text[i];
            } else if (text[i] == this.PATH_CHAR) {
                wall_chars += " ";
                path_chars += this.PATH_CHAR;
                dots_chars += " ";
            } else {
                wall_chars += text[i];
                path_chars += text[i];
                dots_chars += text[i];
            }
        }
        let x = this.X_OFFSET;
        this.ctx.fillStyle  = "rgba(120, 120, 120, 0.5)";
        this.ctx.fillText(dots_chars, x, y);
        this.ctx.fillStyle  = "rgba(220, 220, 220, 1)";
        this.ctx.fillText(wall_chars, x, y);
        this.ctx.fillStyle = "rgba(0, 255, 0, 1)";
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

    this.Clicked = function(x, y) {
        let DR  = (this.ARENA_HEIGHT / this.R * 0.25) * (this.ARENA_HEIGHT / this.R * 0.25);
        let DC  = (this.ARENA_WIDTH / this.C * 0.25) * (this.ARENA_WIDTH / this.C * 0.25);
        let foundR = new Map();
        let foundC = new Map();

        for (let i = 0; i < this.ClickLog.length; ++i) {
            let _x = this.ClickLog[i].x;
            let _y = this.ClickLog[i].y;
            
            for (let a = 0; a < this.R+1; ++a) {
                for (let b = 0; b < this.C; ++b) {
                    let midpoint = this.row_midpoints[a][b];
                    let d = (_x-midpoint.x)*(_x-midpoint.x) + (_y-midpoint.y)*(_y-midpoint.y);
                    if (d < DR) {
                        if (!foundR.has(a*this.C+b)) {
                            foundR.set(a*this.C+b, 1);
                            this.Click(midpoint.x, midpoint.y, false);
                        }
                    }
                }
            }
            
            for (let a = 0; a < this.R; ++a) {
                for (let b = 0; b < this.C+1; ++b) {
                    let midpoint = this.col_midpoints[a][b];
                    let d = (_x-midpoint.x)*(_x-midpoint.x) + (_y-midpoint.y)*(_y-midpoint.y);
                    if (d < DC) {
                        if (!foundC.has(a*(this.C+1)+b)) {
                            foundC.set(a*(this.C+1)+b, 1);
                            this.Click(midpoint.x, midpoint.y, false);
                        }
                    }
                }
            }
        }
        this.Click(-100, -100, true);
        this.ClickLog = [];
    };

    this.Click = function(x, y, redraw) {
        if (x < 0) {
            // NOTE - cv() must be called before Redraw(), it populates this.res used
            // by Redraw() to color the completed squares differently.
            if (this.cv()) {
                this.ToggleLock();
                swal("Correct!", "", "success");
            }
            this.Redraw(this.curr_row_data, this.curr_col_data);
            return;
        }
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
            if (this.orig_row_data[r][c] == OPEN && this.curr_row_data[r][c] == PATH)
                this.curr_row_data[r][c] = OPEN;
            else if (this.orig_row_data[r][c] == OPEN && this.curr_row_data[r][c] == OPEN) {
                if (this.res[r-1][c] < 2 && this.res[r][c] < 2)
                    this.curr_row_data[r][c] = PATH;
            }
            else if (this.orig_row_data[r][c] == GATE && this.curr_row_data[r][c] == EXIT)
                this.curr_row_data[r][c] = GATE;
            else if (this.orig_row_data[r][c] == GATE && this.curr_row_data[r][c] == GATE) {
                if ((r === 0 && this.res[r][c] < 2) || (r == this.R && this.res[r-1][c] < 2))
                    this.curr_row_data[r][c] = EXIT;
            }
        } else { // player clicked on a column
            let r = min_dist_loc.r;
            let c = min_dist_loc.c;
            if (this.orig_col_data[r][c] == OPEN && this.curr_col_data[r][c] == PATH)
                this.curr_col_data[r][c] = OPEN;
            else if (this.orig_col_data[r][c] == OPEN && this.curr_col_data[r][c] == OPEN) {
                if (this.res[r][c-1] < 2 && this.res[r][c] < 2)
                    this.curr_col_data[r][c] = PATH;
            }
            else if (this.orig_col_data[r][c] == GATE && this.curr_col_data[r][c] == EXIT)
                this.curr_col_data[r][c] = GATE;
            else if (this.orig_col_data[r][c] == GATE && this.curr_col_data[r][c] == GATE) {
                if ((c === 0 && this.res[r][c] < 2) || (c == this.C && this.res[r][c-1] < 2))
                    this.curr_col_data[r][c] = EXIT;
            }
        }

        // NOTE - cv() must be called before Redraw(), it populates this.res used
        // by Redraw() to color the completed squares differently.
        if (redraw && this.cv()) {
            this.ToggleLock();
            swal("Correct!", "", "success");
        }
        if (redraw)
            this.Redraw(this.curr_row_data, this.curr_col_data);
        if (!redraw)
            this.UpdateRes(); // this.res is also updated inside cv()
    };

    this.UpdateRes = function() {
        for (let i = 0; i < this.R; ++i)
            for (let j = 0; j < this.C; ++j)
                this.res[i][j] = 0;
        for (let i = 0; i < this.R+1; ++i) {
            for (let j = 0; j < this.C; ++j) {
                let p = 0;
                if (EXIT == this.curr_row_data[i][j] || PATH == this.curr_row_data[i][j] ||
                    FROZEN_EXIT == this.curr_row_data[i][j] || FROZEN_PATH == this.curr_row_data[i][j])
                    p = 1;
                if (p) {
                    if (i > 0)
                        ++this.res[i-1][j];
                    if (i < this.R)
                        ++this.res[i][j];
                }
            }
        }
        for (let i = 0; i < this.R; ++i) {
            for (let j = 0; j < this.C+1; ++j) {
                let p = 0;
                if (EXIT == this.curr_col_data[i][j] || PATH == this.curr_col_data[i][j] ||
                    FROZEN_EXIT == this.curr_col_data[i][j] || FROZEN_PATH == this.curr_col_data[i][j])
                    p = 1;
                if (p) {
                    if (j > 0)
                        ++this.res[i][j-1];
                    if (j < this.C)
                        ++this.res[i][j];
                }
            }
        }
    };

    this.cv = function() {
        for (let i = 0; i < this.R; ++i)
            for (let j = 0; j < this.C; ++j)
                this.res[i][j] = 0;

        for (let i = 0; i < this.R*this.C; ++i)
            this.adj_list[i] = [];

        // We also need to check that there are no cycles
        let num_of_4 = 0;
        for (let i = 0; i < this.R+1; ++i) {
            for (let j = 0; j < this.C; ++j) {
                let p = 0;
                if (EXIT == this.curr_row_data[i][j] || FROZEN_EXIT == this.curr_row_data[i][j]) {
                    ++num_of_4;
                    p = 1;
                } else if (PATH == this.curr_row_data[i][j] || FROZEN_PATH == this.curr_row_data[i][j]) {
                    p = 1;
                }
                if (p) {
                    if (i > 0)
                        ++this.res[i-1][j];
                    if (i < this.R)
                        ++this.res[i][j];
                    if (i > 0 && i < this.R) {
                        let n1 = this.C*i + j;
                        let n2 = this.C*(i-1) + j;
                        this.adj_list[n1].push(n2);
                        this.adj_list[n2].push(n1);
                        //console.log(n1 + " <-> " + n2);
                    }
                }
            }
        }
        
        for (let i = 0; i < this.R; ++i) {
            for (let j = 0; j < this.C+1; ++j) {
                let p = 0;
                if (EXIT == this.curr_col_data[i][j] || FROZEN_EXIT == this.curr_col_data[i][j]) {
                    ++num_of_4;
                    p = 1;
                } else if (PATH == this.curr_col_data[i][j] || FROZEN_PATH == this.curr_col_data[i][j]) {
                    p = 1;
                }
                if (p) {
                    if (j > 0)
                        ++this.res[i][j-1];
                    if (j < this.C)
                        ++this.res[i][j];
                    if (j > 0 && j < this.C) {
                        let n1 = this.C*i + j;
                        let n2 = this.C*i + j-1;
                        this.adj_list[n1].push(n2);
                        this.adj_list[n2].push(n1);
                        //console.log(n1 + " <-> " + n2);
                    }
                }
            }
        }



        if (num_of_4 != 2) { // single entry and exit
            return false;
        } else {
            for (let i = 0; i < this.R; ++i)
                for (let j = 0; j < this.C; ++j)
                    if (this.res[i][j] != 2) // cross every square exactly once
                        return false;
            //for (let i = 0; i < this.R * this.C; ++i)
            //    console.log(this.adj_list[i]);
            // start with a vertex which has only 1 other adjacent vertex
            let start_n = -1;
            for (let i = 0; i < this.R * this.C; ++i) {
                this.colormap[i] = 0; // 0 = unseen, 1 = discovered, 2 = visited
                if (this.adj_list[i].length == 1)
                    start_n = i;
            }
            if (start_n != -1) {
                this.DFS(start_n); // DFS over an undirected graph, so this is NOT a cycle detection
                                   // but we just make sure that the path covers all the vertices
                for (let i = 0; i < this.R * this.C; ++i)
                    if (this.colormap[i] != 2)
                        return false;
            } else
                return false; // SHOULD NOT HIT THIS AT ALL
        }
        return true;
    };

    this.DFS = function(n) {
        this.colormap[n] = 1; // discovered
        for (let i = 0; i < this.adj_list[n].length; ++i) {
            if (this.colormap[this.adj_list[n][i]] === 0)
                this.DFS(this.adj_list[n][i]);
        }
        this.colormap[n] = 2; // visited
    };

    this._prev_x = -1;
    this._prev_y = -1;
    this.LogDragClick = function(x, y) {
        if (x > 0 && y > 0) {
            if (this._prev_x == -1) {
                this._prev_x = x;
                this._prev_y = y;
                this.ClickLog.push({x: x, y: y});
            } else {
                let d = (this._prev_x - x) * (this._prev_x - x) +
                        (this._prev_y - y) * (this._prev_y - y);
                if (d > 25 && this.ClickLog.length < 1000) {
                    this.ClickLog.push({x: x, y: y});
                    this._prev_x = x;
                    this._prev_y = y;
                }
            }
        }
    };

    this.ToggleLock = function() {
        let path_or_exit_present = false;
        for (let i = 0; i < this.R+1; ++i) {
            for (let j = 0; j < this.C; ++j) {
                if (EXIT == this.curr_row_data[i][j] ||
                    PATH == this.curr_row_data[i][j]) {
                    path_or_exit_present = true;
                    break;
                }
            }
            if (path_or_exit_present)
                break;
        }
        if (!path_or_exit_present) {
            for (let i = 0; i < this.R; ++i) {
                for (let j = 0; j < this.C+1; ++j) {
                    if (EXIT == this.curr_col_data[i][j] ||
                        PATH == this.curr_col_data[i][j]) {
                        path_or_exit_present = true;
                        break;
                    }
                }
                if (path_or_exit_present)
                    break;
            }
        }

        // If there are no PATH or EXIT elements, convert FROZEN_PATH and FROZEN_EXIT
        // to PATH and EXIT respectively
        if (!path_or_exit_present) {
            for (let i = 0; i < this.R+1; ++i) {
                for (let j = 0; j < this.C; ++j) {
                    if (FROZEN_PATH == this.curr_row_data[i][j])
                        this.curr_row_data[i][j] = PATH;
                    else if (FROZEN_EXIT == this.curr_row_data[i][j])
                        this.curr_row_data[i][j] = EXIT;
                }
            }
            for (let i = 0; i < this.R; ++i) {
                for (let j = 0; j < this.C+1; ++j) {
                    if (FROZEN_PATH == this.curr_col_data[i][j])
                        this.curr_col_data[i][j] = PATH;
                    else if (FROZEN_EXIT == this.curr_col_data[i][j])
                        this.curr_col_data[i][j] = EXIT;
                }
            }
        } else {
            // If they are there, convert them to FROZEN_PATH and FROZEN_EXIT respectively
            for (let i = 0; i < this.R+1; ++i) {
                for (let j = 0; j < this.C; ++j) {
                    if (PATH == this.curr_row_data[i][j])
                        this.curr_row_data[i][j] = FROZEN_PATH;
                    else if (EXIT == this.curr_row_data[i][j])
                        this.curr_row_data[i][j] = FROZEN_EXIT;
                }
            }
            for (let i = 0; i < this.R; ++i) {
                for (let j = 0; j < this.C+1; ++j) {
                    if (PATH == this.curr_col_data[i][j])
                        this.curr_col_data[i][j] = FROZEN_PATH;
                    else if (EXIT == this.curr_col_data[i][j])
                        this.curr_col_data[i][j] = FROZEN_EXIT;
                }
            }
        }
        this.UpdateRes();
        this.Redraw(this.curr_row_data, this.curr_col_data);
    };

    this.RestoreLockedState = function() {
        // Delete all PATH and EXIT elements
        for (let i = 0; i < this.R+1; ++i) {
            for (let j = 0; j < this.C; ++j) {
                if (PATH == this.curr_row_data[i][j])
                    this.curr_row_data[i][j] = OPEN;
                else if (EXIT == this.curr_row_data[i][j])
                    this.curr_row_data[i][j] = GATE;
            }
        }
        for (let i = 0; i < this.R; ++i) {
            for (let j = 0; j < this.C+1; ++j) {
                if (PATH == this.curr_col_data[i][j])
                    this.curr_col_data[i][j] = OPEN;
                else if (EXIT == this.curr_col_data[i][j])
                    this.curr_col_data[i][j] = GATE;
            }
        }
        this.UpdateRes();
        this.Redraw(this.curr_row_data, this.curr_col_data);
    };
};

