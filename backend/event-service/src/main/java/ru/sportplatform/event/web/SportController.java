package ru.sportplatform.event.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.event.domain.SportType;
import ru.sportplatform.event.service.SportCuratorService;
import ru.sportplatform.event.service.SportCuratorService.MergeProposal;
import ru.sportplatform.event.service.SportCuratorService.SportHit;
import ru.sportplatform.event.service.SportCuratorService.SportMetrics;
import ru.sportplatform.event.service.SportCuratorService.SportProposal;
import ru.sportplatform.event.service.SportTypeService;
import ru.sportplatform.event.web.dto.SportTypeDto;

@RestController
@RequestMapping("/api/sports")
@RequiredArgsConstructor
public class SportController {

    private final SportTypeService sportTypeService;
    private final SportCuratorService curator;

    @GetMapping
    public List<SportTypeDto> list() {
        return sportTypeService.list();
    }

    @GetMapping("/suggest")
    public List<SportHit> suggest(@RequestParam(name = "q", defaultValue = "") String query) {
        return curator.suggest(query);
    }

    @PostMapping("/propose")
    public SportProposal propose(CurrentUser user, @Valid @RequestBody SportProposalRequest request) {
        return curator.propose(user, request.name(), request.description());
    }

    @GetMapping("/merge-proposals")
    public List<MergeProposal> mergeProposals(CurrentUser user) {
        return curator.mergeProposals(user);
    }

    @GetMapping("/metrics")
    public SportMetrics metrics(CurrentUser user) {
        return curator.metrics(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SportTypeDto create(CurrentUser user, @Valid @RequestBody NewSport request) {
        user.requireAuthenticated();
        SportType sport = sportTypeService.findOrCreate(request.name(), user.id());
        return sportTypeService.toDto(sport);
    }

    public record NewSport(@NotBlank(message = "Укажите название") @Size(max = 80) String name) {
    }

    public record SportProposalRequest(
            @NotBlank(message = "Укажите название вида спорта") @Size(max = 80) String name,
            @Size(max = 500) String description
    ) {
    }
}
