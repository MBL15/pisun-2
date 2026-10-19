package ru.sportplatform.event.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.event.domain.SportType;
import ru.sportplatform.event.service.SportTypeService;
import ru.sportplatform.event.web.dto.SportTypeDto;

@RestController
@RequestMapping("/api/sports")
@RequiredArgsConstructor
public class SportController {

    private final SportTypeService sportTypeService;

    @GetMapping
    public List<SportTypeDto> list() {
        return sportTypeService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SportTypeDto create(CurrentUser user, @Valid @RequestBody NewSport request) {
        user.requireAuthenticated();
        SportType sport = sportTypeService.findOrCreate(request.name(), user.id());
        return new SportTypeDto(sport.getId(), sport.getName(), sport.getEmoji(), sport.isCustom(), 0);
    }

    public record NewSport(@NotBlank(message = "Укажите название") @Size(max = 80) String name) {
    }
}
