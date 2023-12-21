import pygame
import pygame_gui
import pandas as pd
import numpy as np
import asyncio

import random, time, sys

class Bird:
    def __init__(self, image_left, image_right, x, y, dx, dy, max_dx=None, max_dy=None):
        self.image_left = image_left
        self.image_right = image_right
        self.x, self.y, self.dx, self.dy, self.max_dx, self.max_dy = x, y, dx, dy, max_dx, max_dy

    def update(self):
        if self.max_dx != None:
            self.dx = min(self.max_dx, max(-self.max_dx, self.dx))
        if self.max_dy != None:
            self.dy = min(self.max_dy, max(-self.max_dy, self.dy))

        self.y += self.dy
        self.x += self.dx

        if self.x  > screen_width or self.x < 0:
            self.dx = -self.dx
            self.x = max(0,min(screen_width,self.x))

    def get_rect(self):
        return self.image_left.get_rect(center=(self.x, self.y))
    
    def get_image(self):
        if self.dx >=0:
            return self.image_right
        else:
            return self.image_left

def scale_image_by_width(image, width):
    original_width = image.get_width()
    original_height = image.get_height()
    return (width, width*original_height//original_width)

def blit_center(surface, image, center_pos):
    # Calculate the top-left corner from the center position
    x = center_pos[0] - image.get_width() // 2
    y = center_pos[1] - image.get_height() // 2

    # Blit the image at the calculated top-left corner position
    surface.blit(image, (x, y))

def funky_function(screen, t):
    x = t
    #random.randint(0, screen.get_height() - jetpack_cat_rect.height)
    t/=70.0
    y = screen.get_height()//2 + screen.get_height()//8 * (np.sin(t) + np.cos(2 * t))
    return x, y

def create_seagull(level, screen_width, seagull_img_left, seagull_img_right):
    factor = 1.0+(level / 2)*.3 #30% increase in speed per every two levels
    x = random.randint(0,screen_width)
    y = 30
    dx = random.choice([-1, 1]) * random.uniform(0.2*factor, 1.5*factor)  # Random horizontal movement
    dy = min(100,random.uniform(.8*factor, 2*factor))  # Random falling speed
    seagulls.append(Bird(seagull_img_left, seagull_img_right, x, y, dx, dy))

def create_pelican(level, screen_width, pelican_img_left, pelican_img_right):
    factor = 1.0+(level / 2)*.3 #30% increase in speed per every two levels
    x = random.randint(0,screen_width)
    y = 30
    dy = random.uniform(.9*factor, 3*factor)  # Random falling speed
    dx = min(50,dy*factor/2.0)  # Random horizontal movement
    pelicans.append(Bird(pelican_img_left, pelican_img_right, x, y, dx, dy, max_dx=dx))

def check_collision(player_pos, player_img, bird):
    player_size = player_img.get_size()
    player_rect = pygame.Rect(
        player_pos[0] - player_size[0] * 0.25,  # Adjust position to center the smaller rectangle
        player_pos[1] - player_size[1] * 0.25,
        player_size[0] * 0.5,  # 50% width
        player_size[1] * 0.5   # 50% height
    )

    bird_rect = bird.get_rect()
    bird_rect = pygame.Rect(
        bird_rect.x + int(bird_rect.width * 0.2),
        bird_rect.y + int(bird_rect.height * 0.2),
        int(bird_rect.width * 0.6),
        int(bird_rect.height * 0.6)
    )

    return bird_rect.colliderect(player_rect)

def end_game(screen, text, name):
    global level,seagulls,pelicans,seagulls_to_avoid,seagulls_avoided,total_seagulls_avoided,remaining_seagulls,remaining_pelicans, jetpack_cats
    scores = pd.read_csv('scores.csv', index_col=0)
    screen_width = screen.get_width()
    screen_height = screen.get_height()
    font = pygame.font.Font(None, 36)
    font2 = pygame.font.Font(None, 28)

    if name not in scores.index:
        scores.loc[name] = {'level': 0, '#seagulls': 0}

    new_high_score = False
    if level > scores['level'][name] or total_seagulls_avoided > scores['#seagulls'][name]:
        scores['level'][name] = level
        scores['#seagulls'][name] = total_seagulls_avoided
        new_high_score = True
        scores = scores.sort_values(by=['level', '#seagulls'], ascending=False)
        scores.to_csv('scores.csv')

    # Draw the window background
    pygame.draw.rect(screen, pygame.Color("lightgrey"), pygame.Rect((0.25*screen_width,0.25*screen_height), (screen_width//2,100)))
    pygame.draw.rect(screen, pygame.Color("grey"), pygame.Rect((0.25*screen_width,0.25*screen_height+100), (screen_width//2,300)))
    txt = font.render(text, True, pygame.Color("black"))
    screen.blit(txt, txt.get_rect(center = (screen_width//2, 0.25*screen_height + 30 )))
    txt = font2.render(f"New high score, congrats {name}!" if new_high_score else "Game Over!", True, pygame.Color("black"))
    screen.blit(txt, txt.get_rect(center = (screen_width//2, 0.25*screen_height + 70 )))

    # Display high scores
    txt = font.render(f"High score table (top-5):", True, pygame.Color("black"))
    screen.blit(txt, txt.get_rect(center = (screen_width//2, 0.25*screen_height + 140 )))
    scores=scores.iloc[:5]
    for idx, column in enumerate(scores.columns):
        txt = font2.render(column, True, pygame.Color("black"))
        screen.blit(txt, txt.get_rect(center = (0.25*screen_width + 100 + (idx+1) * 120, 0.25*screen_height + 200)))
    for idx, (index, row) in enumerate(scores.iterrows()):
        txt = font2.render(index, True, pygame.Color("black"))
        screen.blit(txt, txt.get_rect(center = (0.25*screen_width + 100 , 0.25*screen_height + 225 + idx*25)))
        txt = font2.render(str(row.level), True, pygame.Color("black"))
        screen.blit(txt, txt.get_rect(center = (0.25*screen_width + 220 , 0.25*screen_height + 225 + idx*25)))
        txt = font2.render(str(row['#seagulls']), True, pygame.Color("black"))
        screen.blit(txt, txt.get_rect(center = (0.25*screen_width + 340 , 0.25*screen_height + 225 + idx*25)))

    # Update the display
    pygame.display.flip()
    clock = pygame.time.Clock()


    time.sleep(1)
    is_running = True
    while is_running:
        mouse_pos = pygame.mouse.get_pos()
        # Button properties
        button_rect = pygame.Rect(screen_width // 2 - 100, 0.25*screen_height +410, 200, 50)
        pygame.draw.rect(screen, (120, 120, 240), button_rect)

        text_surface = pygame.font.Font(None, 36).render('Restart', True, (0, 0, 0))
        text_rect = text_surface.get_rect(center=button_rect.center)
        screen.blit(text_surface, text_rect)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                is_running = False
            if event.type == pygame.MOUSEBUTTONDOWN:
                if button_rect.collidepoint(mouse_pos):
                    level = 1
                    seagulls = []
                    pelicans = []
                    seagulls_to_avoid = 10*(1+ ((level+1) % 2))
                    seagulls_avoided = 0
                    total_seagulls_avoided = 0
                    remaining_seagulls = seagulls_to_avoid
                    remaining_pelicans=remaining_seagulls
                    jetpack_cats=0
                    return
        pygame.display.flip()

        clock.tick(30)
    pygame.quit()
    sys.exit()



# Initialize Pygame
pygame.init()
pygame.mixer.init()
pygame.mixer.music.load('sounds/funky.mp3')  # Replace with your music file path
seagull_sound = pygame.mixer.Sound('sounds/seagull.mp3')
pelican_sound = pygame.mixer.Sound('sounds/pelican.mp3')
meow_sound = pygame.mixer.Sound('sounds/meow.mp3')

# Set up the display
screen_width, screen_height = 800, 800
screen = pygame.display.set_mode((screen_width, screen_height))
pygame.display.set_caption("Turtle Run")

# Display the intro image
intro_image = pygame.image.load("images/intro_image.png")
intro_image = pygame.transform.scale(intro_image, (screen_width, screen_height))

# Create a text entry box
manager = pygame_gui.UIManager((screen_width, screen_height))#, theme_path=theme)

# GUI Window properties
window_width = 400
window_height = 150
window_rect = pygame.Rect((screen_width - window_width) // 2, (screen_height - window_height) - 50, window_width, window_height)
font = pygame.font.Font(None, 36)
font2 = pygame.font.Font(None, 28)
font_menu = pygame.font.Font(None, 18)

# Load images
background_image = pygame.image.load('images/background.png').convert()
player_image = pygame.image.load('images/turtle.png').convert_alpha()
seagull_image = pygame.image.load('images/seagull.png').convert_alpha()
pelican_image = pygame.image.load('images/pelican.png').convert_alpha()
jetpack_cat_image = pygame.image.load('images/jetpack_cat.png').convert_alpha()

# Resize images if necessary
background_img = pygame.transform.scale(background_image, (screen_width, screen_height))
player_img = pygame.transform.scale(player_image, scale_image_by_width(player_image,50))
seagull_img_left = pygame.transform.scale(seagull_image, scale_image_by_width(seagull_image,100))
seagull_img_right = pygame.transform.flip(seagull_img_left, True, False)
pelican_img_right = pygame.transform.scale(pelican_image, scale_image_by_width(pelican_image,120))
pelican_img_left = pygame.transform.flip(pelican_img_right, True, False)
jetpack_cat_image = pygame.transform.scale(jetpack_cat_image, scale_image_by_width(jetpack_cat_image,120))

# Game variables
player_pos = [screen_width // 2, screen_height - 50]
jetpack_cat_rect = jetpack_cat_image.get_rect()
seagulls = []
pelicans = []

seagulls_to_avoid = 10
seagulls_avoided = 0
total_seagulls_avoided = 0
remaining_seagulls = 10
remaining_pelicans = remaining_seagulls
jetpack_cats = 0

level = 1

clock = pygame.time.Clock()


name = ""


async def main():
    global remaining_seagulls, remaining_pelicans, seagulls, pelicans, jetpack_cats, seagulls_to_avoid, seagulls_avoided, total_seagulls_avoided, level, name

    text_surface = font.render('Please enter your name', True, pygame.Color('black'))
    text_entry_rect = pygame.Rect(window_rect.x + 20, window_rect.y + 60, window_width - 40, 50)
    text_entry = pygame_gui.elements.UITextEntryLine(relative_rect=text_entry_rect, manager=manager)
    window_surface = pygame.Surface((window_width, window_height), pygame.SRCALPHA)
    window_surface.fill((200, 200, 200, 150))  # Slightly transparent grey
    text_entry.focus()

    jetpack_cat_flying_time = 0

    is_running = True
    is_running_first_time = True
    while is_running:
        time_delta = clock.tick(60)/1000.0

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            # Handle Pygame GUI events
            manager.process_events(event)

            if event.type == pygame_gui.UI_TEXT_ENTRY_FINISHED:
                if event.ui_element == text_entry:
                    name = text_entry.get_text().strip().lower()
                    if len(name)==0:
                        continue
                    print(f"Welcome, {name}!")
                    is_running = False

        # Update Pygame GUI
        manager.update(time_delta)

        # Draw everything
        screen.blit(intro_image, (0, 0))
        if not is_running_first_time:
            screen.blit(window_surface, window_rect.topleft)
            screen.blit(text_surface, (window_rect.x + 20, window_rect.y + 20))
            manager.draw_ui(screen)


        pygame.display.flip()
        if is_running_first_time:
            time.sleep(1)
            is_running_first_time=False

    pygame.mixer.music.play(-1)  # The -1 means the music will loop indefinitely

    # Main game loop
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # Player movement
        keys = pygame.key.get_pressed()
        factor = 1.0+(level / 2)*.3 #30% increase in speed per every two levels

        if keys[pygame.K_LEFT]:
            player_pos[0] -= 5*factor
        if keys[pygame.K_RIGHT]:
            player_pos[0] += 5*factor
        if keys[pygame.K_c]:
            if jetpack_cats > 0 and jetpack_cat_flying_time == 0:
                jetpack_cat_flying_time = 100
                jetpack_cats -= 1
                jetpack_cat_rect.x = 0  # Start from the left side
                jetpack_cat_rect.y = random.randint(0, screen_height - jetpack_cat_rect.height)
                meow_sound.play()

        # Keep player on screen
        player_pos[0] = max(0, min(player_pos[0], screen_width))

        # Spawn birds
        if remaining_seagulls>0 and random.randint(1, 30) == 1:
            create_seagull(level, screen_width, seagull_img_left, seagull_img_right)
            seagull_sound.play()
            remaining_seagulls -= 1
        if remaining_pelicans>0 and random.randint(1, 60) == 1 and len(pelicans) < level:
            create_pelican(level, screen_width, pelican_img_left, pelican_img_right)
            pelican_sound.play()
            remaining_pelicans -= 1

        screen.blit(background_img, (0, 0))  # Draw the background

        #move cat
        if jetpack_cat_flying_time>0:
            jetpack_cat_flying_time -= 1
            t = (100-jetpack_cat_flying_time) * 8
            jetpack_cat_rect.x, jetpack_cat_rect.y = funky_function(screen, t)
            if jetpack_cat_rect.x >= screen_width or jetpack_cat_rect.x <= 0:
                jetpack_cat_flying_time=0
            blit_center(screen, jetpack_cat_image, (jetpack_cat_rect.x,jetpack_cat_rect.y))

        # Move birds
        for seagull in seagulls:
            seagull.update()
            if check_collision(player_pos, player_img, seagull):
                pygame.mixer.music.stop()
                end_game(screen, "Eaten by a seagull!", name)
                pygame.mixer.music.play(-1)
                break

            if check_collision((jetpack_cat_rect.x, jetpack_cat_rect.y), jetpack_cat_image, seagull):
                seagulls.remove(seagull)
                seagulls_avoided += 1
                total_seagulls_avoided += 1

            if seagull.y >= player_pos[1]:
                seagulls.remove(seagull)
                seagulls_avoided += 1
                total_seagulls_avoided += 1
                if seagulls_avoided >= seagulls_to_avoid:
                    level+=1
                    if level%2==0:
                        jetpack_cats += 1
                    seagulls = []
                    pelicans = []
                    seagulls_to_avoid = 10*(1+ ((level+1) % 2))
                    seagulls_avoided = 0
                    remaining_seagulls = seagulls_to_avoid
                    remaining_pelicans=remaining_seagulls
                    time.sleep(0.5)
                    screen.blit(intro_image, (0, 0))
                    text_surface = font.render(f'Get ready for Level {level}!', True, pygame.Color('red'))
                    screen.blit(text_surface, ((screen_width - window_width) // 2 + 100, 320))
                    pygame.display.flip()  # Update the display
                    time.sleep(3)


        for pelican in pelicans:
            dx = abs(player_pos[0] - pelican.x)
            if player_pos[0] < pelican.x:
                dx = -dx
            pelican.dx=dx
            pelican.update()
            if check_collision(player_pos, player_img, pelican):
                pygame.mixer.music.stop()
                end_game(screen, "Eaten by a pelican!", name)
                pygame.mixer.music.play(-1)
                break
            if check_collision((jetpack_cat_rect.x, jetpack_cat_rect.y), jetpack_cat_image, pelican):
                pelicans.remove(pelican)

            if pelican.y >= player_pos[1]:
                pelicans.remove(pelican)

        # Draw everything
        #screen.blit(background_img, (0, 0))  # Draw the background
        if running:
            screen.blit(font_menu.render(f"Seagulls to avoid: {seagulls_to_avoid}", True, pygame.Color('black')), (screen_width - 120, 10))
            screen.blit(font_menu.render(f"Seagulls avoided: {seagulls_avoided}", True, pygame.Color('black')), (screen_width - 120, 30))
            screen.blit(font_menu.render(f"Level: {level}", True, pygame.Color('black')), (screen_width - 120, 50))
            if jetpack_cats>0:
                screen.blit(font_menu.render(f"Jetpack Cats (C): {jetpack_cats}", True, pygame.Color('black')), (screen_width - 120, 70))

            blit_center(screen, player_img, player_pos)
            for seagull in seagulls:
                blit_center(screen, seagull.get_image(), (seagull.x, seagull.y))
            for pelican in pelicans:
                blit_center(screen, pelican.get_image(), (pelican.x, pelican.y))

            pygame.display.flip()  # Update the display
            clock.tick(30)  # 30 frames per second

    pygame.quit()

asyncio.run(main())
